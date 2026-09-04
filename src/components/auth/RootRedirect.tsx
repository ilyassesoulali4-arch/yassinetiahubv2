import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EntryLoader } from '../ui/EntryLoader';

/**
 * Root route. Decides the next destination based on auth + onboarding state.
 * - Bootstrap not done        -> loader (no flash).
 * - Not signed in             -> /entry (the auth entry screen).
 * - Signed in, not onboarded  -> /onboarding.
 * - Signed in, onboarded      -> /home (the signed-in app home).
 *
 * The community-introduction page lives at `/` and is rendered directly
 * (not via this redirect), so it is accessible to all visitors.
 */
export function RootRedirect() {
  const { user, isOnboarded, bootstrapDone } = useAuth();
  if (!bootstrapDone) return <EntryLoader />;
  if (!user) return <Navigate to="/entry" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/home" replace />;
}
