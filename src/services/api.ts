export const API_BASE = 'http://localhost:3001/api';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string | null;
}

async function apiRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: any; token: string }>('/auth/login', { method: 'POST', body: { email, password } }),
  
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    apiRequest<{ user: any; token: string }>('/auth/register', { method: 'POST', body: data }),
  
  me: (token: string) =>
    apiRequest<any>('/auth/me', { token }),
};

// Courses
export const coursesApi = {
  list: (token?: string) => apiRequest<any[]>('/courses', token ? { token } : undefined),

  my: (token: string) => apiRequest<any[]>('/courses/my', { token }),

  uploadIntro: (courseId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append('video', file);
    return fetch('http://localhost:3001/api/courses/upload-intro', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }).then(res => res.json());
  },
  
  get: (id: string) => apiRequest<any>(`/courses/${id}`),
  
  create: (data: any, token: string) =>
    apiRequest<any>('/courses', { method: 'POST', body: data, token }),
  
  update: (id: string, data: any, token: string) =>
    apiRequest<any>(`/courses/${id}`, { method: 'PUT', body: data, token }),
  
  delete: (id: string, token: string) =>
    apiRequest<any>(`/courses/${id}`, { method: 'DELETE', token }),
  
  duplicate: (id: string, token: string) =>
    apiRequest<any>(`/courses/${id}/duplicate`, { method: 'POST', token }),
  
  addModule: (courseId: string, title: string, token: string) =>
    apiRequest<any>(`/courses/${courseId}/modules`, { method: 'POST', body: { title }, token }),
  
  enroll: (id: string, token: string) =>
    apiRequest<any>(`/courses/${id}/enroll`, { method: 'POST', token }),
  
  leaderboard: (id: string) => apiRequest<any[]>(`/courses/${id}/leaderboard`),
};

// Videos
export const videosApi = {
  getMyVideos: (token: string) => apiRequest<any[]>('/videos/my', { token }),
  
  get: (id: string) => apiRequest<any>(`/videos/${id}`),
  
  delete: (id: string, token: string) =>
    apiRequest<any>(`/videos/${id}`, { method: 'DELETE', token }),
  
  updateProgress: (id: string, data: { watchedSeconds?: number; completed?: boolean }, token: string) =>
    apiRequest<any>(`/videos/${id}/progress`, { method: 'POST', body: data, token }),
  
  addComment: (id: string, data: { text: string; timestamp?: number }, token: string) =>
    apiRequest<any>(`/videos/${id}/comments`, { method: 'POST', body: data, token }),
  
  deleteComment: (videoId: string, commentId: string, token: string) =>
    apiRequest<any>(`/videos/${videoId}/comments/${commentId}`, { method: 'DELETE', token }),
  
  pinComment: (videoId: string, commentId: string, token: string) =>
    apiRequest<any>(`/videos/${videoId}/comments/${commentId}/pin`, { method: 'POST', token }),
  
  getNotes: (id: string, token: string) =>
    apiRequest<any[]>(`/videos/${id}/notes`, { token }),
  
  addNote: (id: string, data: { text: string; timestamp: number }, token: string) =>
    apiRequest<any>(`/videos/${id}/notes`, { method: 'POST', body: data, token }),
};

// Quizzes
export const quizzesApi = {
  get: (id: string) => apiRequest<any>(`/quizzes/${id}`),
  
  submit: (id: string, answers: Record<string, number>, token: string) =>
    apiRequest<any>(`/quizzes/${id}/submit`, { method: 'POST', body: { answers }, token }),
};

// Messages
export const messagesApi = {
  getConversations: (token: string) =>
    apiRequest<any[]>('/messages/conversations', { token }),
  
  createConversation: (participantId: string, token: string) =>
    apiRequest<any>('/messages/conversations', { method: 'POST', body: { participantId }, token }),
  
  getMessages: (conversationId: string, token: string) =>
    apiRequest<any[]>(`/messages/conversations/${conversationId}/messages`, { token }),
  
  sendMessage: (conversationId: string, text: string, token: string) =>
    apiRequest<any>(`/messages/conversations/${conversationId}/messages`, { method: 'POST', body: { text }, token }),
};

// Users
export const usersApi = {
  list: (token: string) => apiRequest<any[]>('/users', { token }),
  
  get: (id: string, token: string) => apiRequest<any>(`/users/${id}`, { token }),
  
  getEnrollments: (id: string, token: string) =>
    apiRequest<any[]>(`/users/${id}/enrollments`, { token }),
};

// Forums
export const forumsApi = {
  list: (params?: { type?: string; career?: string }) => 
    apiRequest<any[]>(`/forums${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),
  
  create: (data: { name: string; description?: string; type?: string; courseId?: string }, token: string) =>
    apiRequest<any>('/forums', { method: 'POST', body: data, token }),
  
  getPosts: (forumId: string) => apiRequest<any[]>(`/forums/${forumId}/posts`),
  
  createPost: (forumId: string, data: { title: string; content: string; tags?: string[] }, token: string) =>
    apiRequest<any>(`/forums/${forumId}/posts`, { method: 'POST', body: data, token }),
};
