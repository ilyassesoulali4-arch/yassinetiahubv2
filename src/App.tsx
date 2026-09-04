import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { EntryLayout } from './components/layout/EntryLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { RequireOnboarded } from './components/auth/RequireOnboarded';
import { HomePage } from './pages/HomePage';
import { HomeFeedPage } from './pages/HomeFeedPage';
import { ForumPage } from './pages/ForumPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { IdeasPage } from './pages/IdeasPage';
import { AboutPage } from './pages/AboutPage';
import { GuidelinesPage } from './pages/GuidelinesPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyProfilePage } from './pages/MyProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { EntryPage } from './pages/EntryPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LinksPage } from './pages/LinksPage';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<PublicLayout><HomePage /></PublicLayout>} path="/" />
          <Route element={<EntryLayout><EntryPage /></EntryLayout>} path="/entry" />
          <Route element={<EntryLayout><LoginPage /></EntryLayout>} path="/login" />
          <Route element={<EntryLayout><SignUpPage /></EntryLayout>} path="/signup" />
          <Route
            element={
              <EntryLayout>
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              </EntryLayout>
            }
            path="/onboarding"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <HomeFeedPage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/home"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <ForumPage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/forum"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <PostDetailPage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/forum/:postId"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <IdeasPage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/ideas"
          />
          <Route element={<PublicLayout><AboutPage /></PublicLayout>} path="/about" />
          <Route element={<PublicLayout><GuidelinesPage /></PublicLayout>} path="/guidelines" />
          <Route element={<PublicLayout><ContactPage /></PublicLayout>} path="/contact" />
          <Route element={<PublicLayout><ProfilePage /></PublicLayout>} path="/profile/:username" />
          <Route element={<PublicLayout><LinksPage /></PublicLayout>} path="/links" />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <MyProfilePage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/me"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireOnboarded>
                    <NotificationsPage />
                  </RequireOnboarded>
                </RequireAuth>
              </PublicLayout>
            }
            path="/notifications"
          />
          <Route
            element={
              <PublicLayout>
                <RequireAuth>
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                </RequireAuth>
              </PublicLayout>
            }
            path="/admin"
          />
          <Route element={<Navigate to="/" replace />} path="/index.html" />
          <Route element={<PublicLayout><NotFoundPage /></PublicLayout>} path="*" />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
