import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { VideosPage } from './pages/VideosPage';
import { VideoPlayerPage } from './pages/VideoPlayerPage';
import { UploadPage } from './pages/UploadPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { CreateCoursePage } from './pages/CreateCoursePage';
import { EditCoursePage } from './pages/EditCoursePage';
import { ProfilePage } from './pages/ProfilePage';
import { CourseContentPage } from './pages/CourseContentPage';
import { MessagesPage } from './pages/MessagesPage';
import { StudentsPage } from './pages/StudentsPage';
import { ForumsPage } from './pages/ForumsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-900 text-lg">Cargando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  // Force email verification
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  return <Outlet />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? (user.emailVerified ? <Navigate to="/" replace /> : <Navigate to="/verify-email" replace />) : <LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="my-learning" element={<DashboardPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="videos/:id" element={<VideoPlayerPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/new" element={<CreateCoursePage />} />
          <Route path="courses/:courseId" element={<CourseDetailsPage />} />
          <Route path="courses/:courseId/edit" element={<EditCoursePage />} />
          <Route path="courses/:courseId/content" element={<CourseContentPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="community" element={<ForumsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="profile/:userId" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
