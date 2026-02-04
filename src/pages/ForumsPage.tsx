import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Loader2, BookOpen, Pin, Eye, Heart, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AvatarDisplay } from '../components/AvatarDisplay';

const API_BASE = 'http://localhost:3001/api';

interface Forum {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isPublic: boolean;
  _count: { posts: number };
  course?: { id: string; title: string } | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
}

interface Post {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  views: number;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  _count?: { replies: number; likes: number };
  replies?: Reply[];
  likes?: { userId: string }[];
}

export function ForumsPage() {
  const { token, user } = useAuth();
  const [forums, setForums] = useState<Forum[]>([]);
  const [selectedForum, setSelectedForum] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadForums() {
      try {
        const res = await fetch(`${API_BASE}/forums`);
        const data = await res.json();
        setForums(data);
        if (data.length > 0) setSelectedForum(data[0].id);
      } catch (err) {
        console.error('Failed to load forums:', err);
      } finally {
        setLoading(false);
      }
    }
    loadForums();
  }, []);

  useEffect(() => {
    async function loadPosts() {
      if (!selectedForum) return;
      setLoadingPosts(true);
      try {
        const res = await fetch(`${API_BASE}/forums/${selectedForum}/posts`);
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    }
    loadPosts();
  }, [selectedForum]);

  const handleCreatePost = async () => {
    if (!token || !selectedForum || !newPost.title || !newPost.content) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/forums/${selectedForum}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newPost),
      });
      const createdPost = await res.json();
      const normalizedPost: Post = {
        ...createdPost,
        views: 0,
        isPinned: false,
        author: createdPost.author || { id: user?.id || '', name: user?.name || 'Tú', avatar: null },
        _count: createdPost._count || { replies: 0, likes: 0 },
      };
      setPosts([normalizedPost, ...posts]);
      setNewPost({ title: '', content: '' });
      setShowNewPost(false);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleExpandPost = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/forums/posts/${postId}`);
      const data = await res.json();
      setPosts(posts.map(p => p.id === postId ? { ...p, replies: data.replies, likes: data.likes } : p));
      // Check if user liked this post
      if (data.likes?.some((l: any) => l.userId === user?.id)) {
        setLikedPosts(new Set([...likedPosts, postId]));
      }
      setExpandedPost(postId);
    } catch (err) {
      console.error('Failed to load post details:', err);
    }
  };

  const handleLike = async (postId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/forums/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const { liked } = await res.json();
      if (liked) {
        setLikedPosts(new Set([...likedPosts, postId]));
      } else {
        const newLiked = new Set(likedPosts);
        newLiked.delete(postId);
        setLikedPosts(newLiked);
      }
      // Update like count
      setPosts(posts.map(p => {
        if (p.id === postId && p._count) {
          return { ...p, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleReply = async (postId: string) => {
    if (!token || !replyContent.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`${API_BASE}/forums/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: replyContent }),
      });
      const reply = await res.json();
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return { 
            ...p, 
            replies: [...(p.replies || []), reply],
            _count: { ...p._count, replies: (p._count?.replies || 0) + 1, likes: p._count?.likes || 0 }
          };
        }
        return p;
      }));
      setReplyContent('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const selectedForumData = forums.find(f => f.id === selectedForum);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.24))]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Comunidad</h1>
          <p className="text-slate-600 mt-1">Participa en foros y conecta con otros estudiantes</p>
        </div>
        {token && (
          <button onClick={() => setShowNewPost(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-900 rounded-lg font-medium transition-colors">
            <Plus size={18} /> Nueva Publicación
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-slate-600 mb-3">FOROS</h3>
          {forums.map(forum => (
            <button key={forum.id} onClick={() => setSelectedForum(forum.id)} className={`w-full text-left p-3 rounded-lg transition-all ${selectedForum === forum.id ? 'bg-blue-600 text-slate-900' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                {forum.type === 'COURSE' ? <BookOpen size={14} /> : <MessageSquare size={14} />}
                <span className="font-medium text-sm">{forum.name}</span>
              </div>
              <p className="text-xs opacity-70">{forum._count.posts} publicaciones</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selectedForumData && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{selectedForumData.name}</h2>
              {selectedForumData.description && <p className="text-slate-600 text-sm mt-1">{selectedForumData.description}</p>}
            </div>
          )}

          {showNewPost && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Nueva Publicación</h3>
              <input type="text" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} placeholder="Título" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} placeholder="Escribe tu mensaje..." rows={4} className="w-full bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewPost(false)} className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancelar</button>
                <button onClick={handleCreatePost} disabled={posting || !newPost.title || !newPost.content} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg font-medium flex items-center gap-2">
                  {posting && <Loader2 className="animate-spin" size={16} />} Publicar
                </button>
              </div>
            </div>
          )}

          {loadingPosts ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-600" size={24} /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No hay publicaciones</h3>
              <p className="text-slate-600 text-sm">¡Sé el primero en publicar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-slate-900 shrink-0 overflow-hidden">
                        <AvatarDisplay avatar={post.author?.avatar} name={post.author?.name || 'A'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {post.isPinned && <Pin size={12} className="text-yellow-400" />}
                          <h3 className="font-semibold text-slate-900">{post.title}</h3>
                        </div>
                        <p className="text-slate-600 text-sm mb-3">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>{post.author?.name || 'Anónimo'}</span>
                          <span>{formatDate(post.createdAt)}</span>
                          <span className="flex items-center gap-1"><Eye size={12} /> {post.views || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
                      <button onClick={() => handleLike(post.id)} disabled={!token} className={`flex items-center gap-1.5 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-red-400' : 'text-slate-600 hover:text-red-400'} disabled:opacity-50`}>
                        <Heart size={16} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} /> {post._count?.likes || 0}
                      </button>
                      <button onClick={() => handleExpandPost(post.id)} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-400 transition-colors">
                        <MessageSquare size={16} /> {post._count?.replies || 0} comentarios
                        {expandedPost === post.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {expandedPost === post.id && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-4">
                      {post.replies && post.replies.length > 0 ? (
                        post.replies.map(reply => (
                          <div key={reply.id} className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-900 shrink-0 overflow-hidden">
                              <AvatarDisplay avatar={reply.author?.avatar} name={reply.author?.name || 'A'} />
                            </div>
                            <div className="flex-1 bg-slate-100/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-slate-900">{reply.author?.name}</span>
                                <span className="text-xs text-slate-600">{formatDate(reply.createdAt)}</span>
                              </div>
                              <p className="text-sm text-slate-700">{reply.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-slate-600 text-sm py-2">No hay comentarios aún</p>
                      )}
                      
                      {token && (
                        <div className="flex gap-2 pt-2">
                          <input type="text" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => handleReply(post.id)} disabled={sendingReply || !replyContent.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 rounded-lg flex items-center gap-2">
                            {sendingReply ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
