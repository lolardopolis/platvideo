import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Clock, StickyNote, MessageSquare, Award, Loader2, Video, Reply, Lock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { videosApi } from '../services/api';
import { QuizComponent } from './QuizComponent';

interface Quiz {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    options: string;
    correctIndex: number;
  }>;
}

interface CommentReply {
  id: string;
  text: string;
  visibility: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string };
  attachmentUrl?: string | null;
  replies?: CommentReply[];
}

interface CommentData {
  id: string;
  text: string;
  timestamp: number | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string };
  attachmentUrl?: string | null;
  replies?: CommentReply[];
}

interface NoteData {
  id: string;
  text: string;
  timestamp: number;
  createdAt: string;
}

interface CommentSidebarProps {
  currentTime: number;
  onTimeClick: (time: number) => void;
  quiz?: Quiz;
  initialTab?: 'comments' | 'notes' | 'quiz';
}

export function CommentSidebar({ currentTime, onTimeClick, quiz, initialTab = 'comments' }: CommentSidebarProps) {
  const { id: videoId } = useParams();
  const { token } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'comments' | 'notes' | 'quiz'>(initialTab || 'comments');
  
  // Comments State
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [useTimestamp, setUseTimestamp] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyVisibility, setReplyVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  // Notes State
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [postingNote, setPostingNote] = useState(false);

  // Load comments from API
  useEffect(() => {
    async function loadComments() {
      if (!videoId) return;
      try {
        const video = await videosApi.get(videoId);
        setComments(video.comments || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    loadComments();
  }, [videoId]);

  // Load notes from API
  useEffect(() => {
    async function loadNotes() {
      if (!videoId || !token) {
        setLoadingNotes(false);
        return;
      }
      try {
        const data = await videosApi.getNotes(videoId, token);
        setNotes(data);
      } catch (err) {
        console.error('Failed to load notes:', err);
      } finally {
        setLoadingNotes(false);
      }
    }
    loadNotes();
  }, [videoId, token]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      
      const res = await fetch('http://localhost:3001/api/videos/upload-comment-video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setAttachmentUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !videoId || !token) return;
    
    setPostingComment(true);
    try {
      const comment = await videosApi.addComment(videoId, {
        text: newComment,
        timestamp: useTimestamp ? currentTime : undefined,
        attachmentUrl: attachmentUrl || undefined,
        parentId: replyingTo || undefined,
        visibility: replyingTo ? replyVisibility : "PUBLIC",
      }, token);
      
      setComments([comment, ...comments]);
      setNewComment("");
      setAttachmentUrl(null);
      setReplyingTo(null);
      setUseTimestamp(false);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  const handlePostNote = async () => {
    if (!newNote.trim() || !videoId || !token) return;
    
    setPostingNote(true);
    try {
      const note = await videosApi.addNote(videoId, {
        text: newNote,
        timestamp: currentTime,
      }, token);
      
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err) {
      console.error('Failed to post note:', err);
    } finally {
      setPostingNote(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-900">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-slate-100/50 p-1 rounded-lg">
        <button 
          onClick={() => setActiveTab('comments')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'comments' ? 'bg-slate-700 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}
        >
          <MessageSquare size={16} />
          Comentarios
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'notes' ? 'bg-slate-700 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}
        >
          <StickyNote size={16} />
          Mis Notas
        </button>
        {quiz && (
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'quiz' ? 'bg-slate-700 text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-700'}`}
          >
            <Award size={16} />
            Evaluación
          </button>
        )}
      </div>
      
      {activeTab === 'quiz' && quiz ? (
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          <QuizComponent quiz={quiz} onRetry={() => console.log('Retry quiz')} />
        </div>
      ) : activeTab === 'notes' ? (
        <>
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {loadingNotes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-slate-600" size={24} />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center text-slate-600 py-8 text-sm">
                No tienes notas en este video.
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-slate-100/50 p-3 rounded-lg border border-slate-300/50 group hover:border-blue-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <button 
                      onClick={() => onTimeClick(note.timestamp)}
                      className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                    >
                      <Clock size={10} />
                      {formatTime(note.timestamp)}
                    </button>
                    <span className="text-xs text-slate-600">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{note.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Note Input */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Clock size={12} />
                Guardando en: <span className="text-blue-400 font-mono">{formatTime(currentTime)}</span>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una nota personal..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none h-24"
              />
              <button
                onClick={handlePostNote}
                disabled={!newNote.trim() || postingNote}
                className="absolute bottom-2 right-2 p-2 bg-yellow-600 text-slate-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-yellow-500/20"
              >
                {postingNote ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Comment List */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-slate-600" size={24} />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center text-slate-600 py-8 text-sm">
                No hay comentarios aún. ¡Sé el primero!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {comment.user.avatar || comment.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{comment.user.name}</span>
                        <span className="text-xs text-slate-600">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>
                      
                      {comment.timestamp !== null && comment.timestamp >= 0 && (
                        <button 
                          onClick={() => onTimeClick(comment.timestamp!)}
                          className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-0.5 rounded"
                        >
                          <Clock size={12} className="mr-1" />
                          {formatTime(comment.timestamp)}
                        </button>
                      )}
                      {/* Video attachment */}
                      {comment.attachmentUrl && (
                        <div className="mt-2">
                          <video src={`http://localhost:3001${comment.attachmentUrl}`} controls className="rounded-lg max-w-full max-h-40" />
                        </div>
                      )}
                      {/* Reply button */}
                      <button onClick={() => setReplyingTo(comment.id)} className="mt-1 text-xs text-slate-600 hover:text-blue-400 flex items-center gap-1">
                        <Reply size={12} /> Responder
                      </button>
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-300 space-y-3">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{reply.user.name}</span>
                                {reply.visibility === "PRIVATE" && <Lock size={10} className="text-yellow-500" title="Respuesta privada" />}
                                <span className="text-xs text-slate-600">{formatDate(reply.createdAt)}</span>
                              </div>
                              <p className="text-slate-600">{reply.text}</p>
                              {reply.attachmentUrl && (
                                <video src={`http://localhost:3001${reply.attachmentUrl}`} controls className="rounded-lg max-w-full max-h-32 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            {/* Replying indicator */}
            {replyingTo && (
              <div className="mb-2 p-2 bg-blue-500/10 rounded-lg flex items-center justify-between">
                <span className="text-xs text-blue-400">Respondiendo a un comentario</span>
                <div className="flex items-center gap-2">
                  <select
                    value={replyVisibility}
                    onChange={(e) => setReplyVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
                    className="text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-900"
                  >
                    <option value="PUBLIC">Pública</option>
                    <option value="PRIVATE">Solo para el alumno</option>
                  </select>
                  <button onClick={() => setReplyingTo(null)} className="text-xs text-slate-600 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setUseTimestamp(!useTimestamp)}
                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${useTimestamp ? 'bg-blue-600 text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Clock size={12} />
                {useTimestamp ? `En ${formatTime(currentTime)}` : 'Vincular tiempo'}
              </button>
              {/* Attach video button */}
              <label className="text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                {uploadingVideo ? <Loader2 size={12} className="animate-spin" /> : <Video size={12} />}
                {attachmentUrl ? "Video adjunto ✓" : "Adjuntar video"}
              </label>
              {attachmentUrl && (
                <button onClick={() => setAttachmentUrl(null)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <X size={12} /> Quitar
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe una duda o comentario..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
              />
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || postingComment}
                className="absolute bottom-2 right-2 p-2 bg-blue-600 text-slate-900 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20"
              >
                {postingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
