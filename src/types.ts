export interface User {
  id: string;
  name: string;
  avatar: string; // Initials or URL
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  text: string;
  timestamp: number;
  replies: Reply[];
  createdAt: string;
}

export interface Reply {
  id: string;
  userId: string;
  user: User;
  type: 'text' | 'video';
  content: string; // Text or Video URL
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string; // The other user's ID
  participantName: string;
  participantAvatar: string;
  participantRole: 'student' | 'tutor';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}
