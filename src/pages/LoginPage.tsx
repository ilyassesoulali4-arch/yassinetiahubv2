import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pushToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, loading, resetPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset inline panel
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const resetEmailRef = useRef<HTMLInputElement | null>(null);

  // If the user is already signed in, redirect away from the login page.
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    }
  }, [user, loading, location.state]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resetOpen) {
      setResetEmail(email);
      setTimeout(() => resetEmailRef.current?.focus(), 50);
    }
  }, [resetOpen, email]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      pushToast('تم تسجيل الدخول بنجاح.', 'success');
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      pushToast('تم تسجيل الدخول بنجاح.', 'success');
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
      setError(msg);
    } finally {
      setGoogleBusy(false);
    }
  };

  const onReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(null);
    setResetDone(false);
    const target = resetEmail.trim();
    if (!target) {
      setResetError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    setResetSubmitting(true);
    try {
      await resetPassword(target);
      setResetDone(true);
      pushToast('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.', 'success');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
      setResetError(msg);
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="container container--narrow page-pad login-page">
      <div className="card login-page__card">
        <h1 className="card__title login-page__title">تسجيل الدخول</h1>
        <p className="card__hint login-page__hint">أدخل بياناتك للوصول إلى حسابك</p>

        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="lg"
          block
          onClick={onGoogle}
          disabled={googleBusy || submitting}
          aria-label="تسجيل الدخول عبر Google"
        >
          <GoogleMark />
          {googleBusy ? 'جاري التحويل…' : 'متابعة باستخدام Google'}
        </Button>

        <div className="login-page__divider" role="separator" aria-orientation="horizontal">
          <span>أو</span>
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="login-email">البريد الإلكتروني</label>
            <input
              ref={emailRef}
              id="login-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="login-pass">كلمة المرور</label>
            <div className="login-page__passwrap">
              <input
                id="login-pass"
                className="input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="login-page__toggle"
              >
                {show ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={submitting || googleBusy}
          >
            {submitting ? 'جارٍ الدخول…' : 'دخول'}
          </button>
        </form>

        <p className="login-page__forgot">
          <button
            type="button"
            className="login-page__link login-page__link--button"
            onClick={() => { setResetOpen((v) => !v); setResetError(null); setResetDone(false); }}
            aria-expanded={resetOpen}
            aria-controls="reset-panel"
          >
            {resetOpen ? 'إلغاء' : 'نسيت كلمة المرور؟'}
          </button>
        </p>

        {resetOpen && (
          <div id="reset-panel" className="login-page__reset" role="region" aria-label="إعادة تعيين كلمة المرور">
            {resetDone ? (
              <p className="login-page__reset-msg">
                إذا كان البريد مسجلاً لدينا، فقد أُرسلت إليه رسالة تحتوي على رابط إعادة التعيين.
              </p>
            ) : (
              <form className="form" onSubmit={onReset} noValidate>
                {resetError && (
                  <div role="alert" className="alert">{resetError}</div>
                )}
                <div className="field">
                  <label className="field__label" htmlFor="reset-email">البريد الإلكتروني</label>
                  <input
                    ref={resetEmailRef}
                    id="reset-email"
                    className="input"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn--ghost btn--block"
                  disabled={resetSubmitting || submitting || googleBusy}
                >
                  {resetSubmitting ? 'جارٍ الإرسال…' : 'إرسال رابط إعادة التعيين'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="login-page__footer">
          ليس لديك حساب؟ <Link to="/signup" className="login-page__link">إنشاء حساب</Link>
        </p>
        <p className="login-page__subfooter">
          <Link to="/" className="btn btn--quiet">← العودة للصفحة الرئيسية</Link>
        </p>
      </div>
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
