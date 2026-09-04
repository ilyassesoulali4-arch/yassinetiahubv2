import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EntryLoader } from '../ui/EntryLoader';

/**
 * Gate for routes that require a complete profile.
 * - Not signed in       -> /login
 * - Signed in, incomplete profile -> /onboarding
 * - Signed in, complete profile   -> render
 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { user, isOnboarded, bootstrapDone } = useAuth();
  const location = useLocation();

  if (!bootstrapDone) return <EntryLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
