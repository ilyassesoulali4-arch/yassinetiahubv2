import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Guards a route so only signed-in users with role 'admin' can see it.
 * Plain signed-in users see a "not authorized" placeholder.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, userDoc, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <h1>غير مصرّح</h1>
        <p className="lede">هذا الحساب لا يملك صلاحيات الوصول إلى لوحة الإدارة.</p>
        <a href="#/" className="btn btn--primary">العودة للرئيسية</a>
      </div>
    );
  }
  // userDoc may be null briefly after sign-in. We still allow access once
  // we have a confirmed admin role above.
  void userDoc;
  return <>{children}</>;
}
