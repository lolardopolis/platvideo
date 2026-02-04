import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, Info, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messagesApi, usersApi, API_BASE } from '../services/api';

// Helper to render avatar as image or initials
function AvatarDisplay({ avatar, name, className = '' }: { avatar: string; name: string; className?: string }) {
  const isImageUrl = avatar?.startsWith('/');
  const baseUrl = API_BASE.replace('/api', '');
  
  if (isImageUrl) {
    return (
      <img 
        src={`${baseUrl}${avatar}`} 
        alt={name}
        className={`object-cover w-full h-full ${className}`}
      />
    );
  }
  
  return <span>{avatar || name?.substring(0, 2).toUpperCase()}</span>;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
}

interface ConversationItem {
  id: string;
  participant: Participant;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  sender: Participant;
}

export function MessagesPage() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialChatId = searchParams.get('chat');
  
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<Participant[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = conversations.find(c => c.id === activeChatId);

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  // Load conversations
  useEffect(() => {
    async function loadConversations() {
      if (!token) return;
      try {
        setError(null);
        console.log('Loading conversations from:', API_BASE);
        const data = await messagesApi.getConversations(token);
        setConversations(data.map((c: any) => ({
          id: c.id,
          participant: c.participant || { id: 'unknown', name: 'Usuario', avatar: 'U' },
          lastMessage: c.lastMessage || '',
          lastMessageTime: c.lastMessageTime ? formatTime(c.lastMessageTime) : '',
          unreadCount: c.unreadCount || 0,
        })));
        
        // Auto-select first conversation if none selected
        if (!activeChatId && data.length > 0) {
          setActiveChatId(data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load conversations:', err);
        setError(err.message || 'Error al cargar mensajes');
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, [token]);

  // Load messages when active chat changes
  useEffect(() => {
    async function loadMessages() {
      if (!token || !activeChatId) return;
      try {
        const data = await messagesApi.getMessages(activeChatId, token);
        setMessages(data.map((m: any) => ({
          id: m.id,
          text: m.text,
          senderId: m.senderId,
          createdAt: formatTime(m.createdAt),
          sender: m.sender,
        })));
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    loadMessages();
  }, [token, activeChatId]);

  // Load users for new chat
  useEffect(() => {
    async function loadUsers() {
      if (!token || !showNewChat) return;
      try {
        const data = await usersApi.list(token);
        setUsers(data.filter((u: any) => u.id !== user?.id).map((u: any) => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar || u.name.substring(0, 2).toUpperCase(),
        })));
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    }
    loadUsers();
  }, [token, showNewChat, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId || !token) return;
    
    setSendingMessage(true);
    try {
      const message = await messagesApi.sendMessage(activeChatId, newMessage, token);
      setMessages(prev => [...prev, {
        id: message.id,
        text: message.text,
        senderId: message.senderId,
        createdAt: 'Ahora',
        sender: message.sender,
      }]);
      setNewMessage('');
      
      // Update conversation list
      setConversations(prev => prev.map(c => 
        c.id === activeChatId 
          ? { ...c, lastMessage: newMessage, lastMessageTime: 'Ahora' }
          : c
      ));
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = async (participantId: string) => {
    if (!token) return;
    try {
      const result = await messagesApi.createConversation(participantId, token);
      setActiveChatId(result.id);
      setShowNewChat(false);
      
      // Refresh conversations
      const data = await messagesApi.getConversations(token);
      setConversations(data.map((c: any) => ({
        id: c.id,
        participant: c.participant || { id: 'unknown', name: 'Usuario', avatar: 'U' },
        lastMessage: c.lastMessage || '',
        lastMessageTime: c.lastMessageTime ? formatTime(c.lastMessageTime) : '',
        unreadCount: c.unreadCount || 0,
      })));
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-theme(spacing.24))] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.24))] bg-white border border-slate-200 rounded-2xl overflow-hidden flex animate-in fade-in duration-500 shadow-2xl">
      {/* Sidebar - Conversation List */}
      <div className={`${activeChatId && !showNewChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-200 flex-col`}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Mensajes</h2>
            <button 
              onClick={() => setShowNewChat(!showNewChat)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              type="text" 
              placeholder="Buscar conversación..." 
              className="w-full bg-slate-100 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500"
            />
          </div>
        </div>
        
        {showNewChat ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-medium text-slate-600">Nueva Conversación</h3>
            </div>
            {users.map(u => (
              <div 
                key={u.id}
                onClick={() => startNewConversation(u.id)}
                className="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold overflow-hidden">
                  <AvatarDisplay avatar={u.avatar} name={u.name} />
                </div>
                <span className="text-slate-900 font-medium">{u.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm">
                {error ? (
                    <div className="text-red-500 bg-red-50 p-4 rounded-lg">
                      <p className="font-bold">Error de conexión:</p>
                      <p>{error}</p>
                      <button onClick={() => window.location.reload()} className="mt-2 text-blue-600 underline">
                        Reintentar
                      </button>
                    </div>
                ) : (
                    "No tienes conversaciones aún. Haz clic en + para iniciar una."
                )}
              </div>
            ) : (
              conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveChatId(conv.id)}
                  className={`p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors ${activeChatId === conv.id ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex gap-3">
                    <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold overflow-hidden">
                          <AvatarDisplay avatar={conv.participant?.avatar || ''} name={conv.participant?.name || 'U'} />
                        </div>
                        {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-slate-900 text-[10px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                                {conv.unreadCount}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                            {conv.participant?.name || 'Usuario'}
                        </span>
                        <span className="text-xs text-slate-600 shrink-0">{conv.lastMessageTime}</span>
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-600'}`}>
                        {conv.lastMessage || 'Sin mensajes'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      {activeChatId && activeConversation ? (
        <div className="flex-1 flex flex-col bg-white/50">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-sm z-10 text-slate-900">
            <div className="flex items-center gap-3">
               <button onClick={() => setActiveChatId(null)} className="md:hidden text-slate-600 hover:text-slate-900">
                   <ArrowLeft size={20} />
               </button>
               <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold overflow-hidden">
                 <AvatarDisplay avatar={activeConversation.participant?.avatar || ''} name={activeConversation.participant?.name || 'U'} />
               </div>
               <div>
                 <h3 className="font-bold">{activeConversation.participant?.name || 'Usuario'}</h3>
                 <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> En línea
                 </span>
               </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Info size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {messages.map((msg) => {
                 const isMe = msg.senderId === user?.id;
                 return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-blue-600 text-slate-900 rounded-br-none' : 'bg-slate-100 text-slate-700 rounded-bl-none'}`}>
                             <p className="text-sm">{msg.text}</p>
                             <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-blue-200' : 'text-slate-600'}`}>
                                 {msg.createdAt}
                             </span>
                         </div>
                     </div>
                 );
             })}
             <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
              <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-blue-600 text-slate-900 p-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      {sendingMessage ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
              </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col text-slate-600">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Send size={24} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-slate-600">Tus Mensajes</p>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
        </div>
      )}
    </div>
  );
}
