import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UsernameError } from '../lib/firestore/usernames';
import { PROFILE_LIMITS } from '../lib/users';
import { pushToast } from '../components/ui/Toast';
import { Avatar } from '../components/user/Avatar';
import { Button } from '../components/ui/Button';
import { isValidUsername } from '../lib/firestore/usernames';
import { normalizeUsername } from '../lib/firestore/util';

export function OnboardingPage() {
  const { user, userDoc, completeOnboarding, signOut, isOnboarded } = useAuth();
  const navigate = useNavigate();

  // Prefill from Google / existing user doc. We do not fabricate a username.
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Prefill display name from Google (or from existing doc if available).
    const initialName =
      userDoc?.displayName?.trim() ||
      user.displayName?.trim() ||
      (user.email ? user.email.split('@')[0] : '');
    setDisplayName(initialName);
    setUsername(userDoc?.username ?? '');
    setPhotoURL(userDoc?.photoURL ?? user.photoURL ?? '');
    setBio(userDoc?.bio ?? '');
  }, [user, userDoc]);

  if (!user) {
    // AuthContext's RequireAuth wrapper will normally send the user to
    // /login, but if for any reason the component is mounted without a
    // user, we navigate defensively.
    navigate('/login', { replace: true });
    return null;
  }

  if (isOnboarded) {
    // Already complete; send to the main app.
    navigate('/', { replace: true });
    return null;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const dn = displayName.trim();
    if (dn.length < 1 || dn.length > PROFILE_LIMITS.DISPLAY_NAME_MAX) {
      setError('الاسم يجب أن يكون بين 1 و 50 حرفًا.');
      return;
    }
    const un = normalizeUsername(username);
    if (!isValidUsername(un)) {
      setError('اسم المستخدم يجب أن يكون 3-20 حرفًا (حروف إنجليزية صغيرة، أرقام، underscore).');
      return;
    }
    if (photoURL.trim()) {
      if (photoURL.trim().length > PROFILE_LIMITS.PHOTO_URL_MAX) {
        setError('رابط الصورة طويل جدًا.');
        return;
      }
      if (!/^https?:\/\//i.test(photoURL.trim())) {
        setError('يجب أن يبدأ رابط الصورة بـ http:// أو https://');
        return;
      }
    }
    if (bio.length > PROFILE_LIMITS.BIO_MAX) {
      setError(`النبذة يجب ألا تتجاوز ${PROFILE_LIMITS.BIO_MAX} حرفًا.`);
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding({
        displayName: dn,
        username: un,
        photoURL: photoURL.trim() ? photoURL.trim() : null,
        bio: bio.trim() ? bio.trim() : null
      });
      pushToast('مرحبًا بك!', 'success');
      // Navigate to the main app.
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof UsernameError) {
        setError(err.message);
      } else {
        const msg = (err as { message?: string })?.message ?? 'حدث خطأ غير متوقع.';
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const previewName = displayName.trim() || (user.email ?? 'عضو');
  const previewUsername = normalizeUsername(username);
  const previewReady = isValidUsername(previewUsername);

  return (
    <div className="container container--narrow entry-page">
      <section className="entry-card onboarding-card">
        <header className="onboarding-card__head">
          <h1 className="entry-card__title">أكمل ملفك الشخصي</h1>
          <p className="entry-card__sub">
            نحتاج بعض المعلومات الأساسية قبل أن تبدأ في المجتمع. لن تظهر هذه الصفحة مرة أخرى.
          </p>
        </header>

        <div className="onboarding-preview">
          <Avatar name={previewName} photoURL={photoURL || user.photoURL} size={64} />
          <div>
            <div className="onboarding-preview__name">{previewName}</div>
            <div className="onboarding-preview__username" dir="ltr">
              {previewReady ? `@${previewUsername}` : '@…'}
            </div>
          </div>
        </div>

        {error && <div role="alert" className="alert entry-card__alert">{error}</div>}

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="on-name">الاسم الظاهر</label>
            <input
              id="on-name"
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, PROFILE_LIMITS.DISPLAY_NAME_MAX))}
              maxLength={PROFILE_LIMITS.DISPLAY_NAME_MAX}
              required
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="on-username">اسم المستخدم</label>
            <input
              id="on-username"
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, PROFILE_LIMITS.DISPLAY_NAME_MAX))}
              maxLength={20}
              required
              autoComplete="username"
              dir="ltr"
              aria-describedby="on-username-hint"
            />
            <p id="on-username-hint" className="card__hint" style={{ marginTop: 2 }}>
              3 إلى 20 حرفًا: حروف إنجليزية صغيرة، أرقام، underscore. لا يمكن تغييره لاحقًا.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="on-photo">رابط الصورة (اختياري)</label>
            <input
              id="on-photo"
              className="input"
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value.slice(0, PROFILE_LIMITS.PHOTO_URL_MAX))}
              maxLength={PROFILE_LIMITS.PHOTO_URL_MAX}
              placeholder="https://…"
              dir="ltr"
              autoComplete="off"
            />
            <p className="card__hint" style={{ marginTop: 2 }}>اتركه فارغًا لاستخدام الأحرف الأولى كصورة.</p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="on-bio">نبذة (اختياري)</label>
            <textarea
              id="on-bio"
              className="textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, PROFILE_LIMITS.BIO_MAX))}
              maxLength={PROFILE_LIMITS.BIO_MAX}
              placeholder="اكتب نبذة قصيرة عنك."
            />
            <div className="field__counter" aria-live="polite">{bio.length} / {PROFILE_LIMITS.BIO_MAX}</div>
          </div>

          <Button type="submit" size="lg" block disabled={saving}>
            {saving ? 'جاري الحفظ…' : 'حفظ ومتابعة'}
          </Button>
          <button
            type="button"
            className="btn btn--quiet"
            style={{ marginTop: 8 }}
            onClick={onSignOut}
          >
            تسجيل الخروج
          </button>
        </form>
      </section>
    </div>
  );
}
