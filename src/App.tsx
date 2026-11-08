import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { CourseListPage } from './pages/public/CourseListPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import { AuthPage } from './pages/public/AuthPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';

// Student Pages
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { CoursePlayerPage } from './pages/student/CoursePlayerPage';
import { ProfilePage } from './pages/student/ProfilePage';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminCourseEditorPage } from './pages/admin/AdminCourseEditorPage';
import { AdminLessonsPage } from './pages/admin/AdminLessonsPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';

// Public Layout Wrapper with standard Header & Footer
const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Student Routes with Navbar + Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CourseListPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/register" element={<AuthPage initialMode="register" />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Student Routes */}
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute>
                  <MyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Dedicated Course Player (Focus Mode without regular Navbar) */}
          <Route
            path="/courses/:id/learn"
            element={
              <ProtectedRoute>
                <CoursePlayerPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Panel (Accessible only via /admin) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="courses/new" element={<AdminCourseEditorPage />} />
            <Route path="courses/:id/edit" element={<AdminCourseEditorPage />} />
            <Route path="courses/:id/lessons" element={<AdminLessonsPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
