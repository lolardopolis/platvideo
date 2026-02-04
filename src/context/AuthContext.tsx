import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, coursesApi, usersApi } from '../services/api';

interface User {
  emailVerified?: boolean;
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  role: 'alumno' | 'tutor';
  setUser: (user: User) => void;
  setRole: (role: 'alumno' | 'tutor') => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role?: string }) => Promise<void>;
  logout: () => void;
  enrolledCourses: string[];
  completedVideos: string[];
  enroll: (courseId: string) => Promise<void>;
  toggleVideoComplete: (videoId: string, courseId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<'alumno' | 'tutor'>('alumno');
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const userData = await authApi.me(token);
        setUser(userData);
        setRole(userData.role === 'TUTOR' ? 'tutor' : 'alumno');
        
        const enrollments = await usersApi.getEnrollments(userData.id, token);
        setEnrolledCourses(enrollments.map((e: any) => e.courseId));
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem('token', result.token);
    setToken(result.token);
    setUser(result.user);
    setRole(result.user.role === 'TUTOR' ? 'tutor' : 'alumno');
  };

  const register = async (data: { email: string; password: string; name: string; role?: string }) => {
    const result = await authApi.register(data);
    localStorage.setItem('token', result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setEnrolledCourses([]);
    setCompletedVideos([]);
  };

  const enroll = async (courseId: string) => {
    if (!token) return;
    try {
      await coursesApi.enroll(courseId, token);
      setEnrolledCourses(prev => [...prev, courseId]);
    } catch (error: any) {
      if (error.message === 'Already enrolled') {
        setEnrolledCourses(prev => prev.includes(courseId) ? prev : [...prev, courseId]);
      } else {
        throw error;
      }
    }
  };

  const toggleVideoComplete = (videoId: string, _courseId: string) => {
    setCompletedVideos(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      role,
      setRole,
      login,
      register,
      logout,
      enrolledCourses,
      completedVideos,
      enroll,
      toggleVideoComplete,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
