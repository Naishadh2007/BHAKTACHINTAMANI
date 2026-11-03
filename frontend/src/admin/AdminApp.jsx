import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChaptersPage from './pages/ChaptersPage';
import ChapterEditPage from './pages/ChapterEditPage';
import UsersPage from './pages/UsersPage';
import FeedbacksPage from './pages/FeedbacksPage';
import ActivityPage from './pages/ActivityPage';
import AdminLayout from './components/AdminLayout';
import './admin.css';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="chapters" element={<ChaptersPage />} />
                <Route path="chapters/new" element={<ChapterEditPage />} />
                <Route path="chapters/:id/edit" element={<ChapterEditPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="feedbacks" element={<FeedbacksPage />} />
                <Route path="activity" element={<ActivityPage />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
