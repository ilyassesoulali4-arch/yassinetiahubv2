import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pushToast } from '../components/ui/Toast';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function SignUpPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const name = displayName.trim();
    const userNormalized = username.trim().toLowerCase();
    if (name.length < 2) {
      setError('يرجى إدخال اسم لا يقل عن حرفين.');
      return;
    }
    if (!USERNAME_RE.test(userNormalized)) {
      setError('اسم المستخدم يجب أن يكون 3-20 حرفًا (حروف إنجليزية صغيرة، أرقام، underscore).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ email: email.trim(), password, displayName: name, username: userNormalized });
      pushToast('تم إنشاء حسابك بنجاح.', 'success');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container container--narrow page-pad login-page">
      <div className="card login-page__card">
        <h1 className="card__title login-page__title">إنشاء حساب</h1>
        <p className="card__hint login-page__hint">انضم إلى المجتمع وشارك أفكارك</p>

        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="su-name">الاسم</label>
            <input
              ref={nameRef}
              id="su-name"
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              maxLength={50}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="su-username">اسم المستخدم</label>
            <input
              id="su-username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
              autoComplete="username"
              inputMode="text"
              dir="ltr"
              required
              aria-describedby="su-username-hint"
            />
            <p id="su-username-hint" className="card__hint" style={{ marginTop: 2 }}>
              3 إلى 20 حرفًا: حروف إنجليزية صغيرة، أرقام، underscore.
            </p>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="su-email">البريد الإلكتروني</label>
            <input
              id="su-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="su-pass">كلمة المرور</label>
            <div className="login-page__passwrap">
              <input
                id="su-pass"
                className="input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
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
          <div className="field">
            <label className="field__label" htmlFor="su-confirm">تأكيد كلمة المرور</label>
            <input
              id="su-confirm"
              className="input"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={submitting}
          >
            {submitting ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="login-page__footer">
          لديك حساب بالفعل؟ <a href="#/login" className="login-page__link">تسجيل الدخول</a>
        </p>
        <p className="login-page__subfooter">
          <a href="#/" className="btn btn--quiet">← العودة للصفحة الرئيسية</a>
        </p>
      </div>
    </div>
  );
}
