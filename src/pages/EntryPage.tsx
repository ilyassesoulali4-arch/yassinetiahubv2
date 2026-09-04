import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pushToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';

export function EntryPage() {
  const { signInWithGoogle } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      // The auth state listener will fire and the router will redirect
      // to /onboarding (if profile incomplete) or / (if complete).
      pushToast('تم تسجيل الدخول بنجاح.', 'success');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
      setError(msg);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="container container--narrow entry-page">
      <section className="entry-card">
        <img src="/logo.png" alt="" className="entry-card__logo" width={96} height={96} />
        <h1 className="entry-card__title">مرحبًا بك في YassineTia Hub</h1>
        <p className="entry-card__sub">
          مجتمع المساهمات والأفكار. سجّل الدخول للمشاركة في المنتدى، متابعة الأفكار، وتلقي الإشعارات.
        </p>

        {error && (
          <div role="alert" className="alert entry-card__alert">{error}</div>
        )}

        <div className="entry-card__actions">
          <Button
            type="button"
            variant="primary"
            size="lg"
            block
            onClick={onGoogle}
            disabled={googleBusy}
            aria-label="متابعة باستخدام Google"
          >
            <GoogleMark />
            {googleBusy ? 'جاري التحويل…' : 'متابعة باستخدام Google'}
          </Button>

          <div className="login-page__divider" role="separator" aria-orientation="horizontal">
            <span>أو</span>
          </div>

          <Link to="/login" className="btn btn--ghost btn--lg btn--block">
            تسجيل الدخول بالبريد وكلمة المرور
          </Link>
          <Link to="/signup" className="btn btn--primary btn--lg btn--block entry-card__cta">
            إنشاء حساب جديد
          </Link>
        </div>

        <p className="entry-card__legal">
          بمتابعتك، فأنت توافق على{' '}
          <Link to="/guidelines" className="entry-card__legal-link">قواعد المجتمع</Link>.
        </p>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.63z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
