import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateOwnProfile, PROFILE_LIMITS } from '../lib/users';
import { mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { Avatar } from '../components/user/Avatar';
import { Button } from '../components/ui/Button';
import { TimeAgo } from '../components/shared/TimeAgo';

export function MyProfilePage() {
  const { user, userDoc, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userDoc) return;
    setDisplayName(userDoc.displayName ?? '');
    setBio(userDoc.bio ?? '');
    setPhotoURL(userDoc.photoURL ?? '');
    setCoverURL(userDoc.coverURL ?? '');
  }, [userDoc]);

  if (loading) {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <p className="lede">جاري التحميل…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateOwnProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        photoURL: photoURL.trim() ? photoURL.trim() : null,
        coverURL: coverURL.trim() ? coverURL.trim() : null
      });
      pushToast('تم حفظ التغييرات.', 'success');
    } catch (err) {
      setError(mapFsError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container container--narrow page-pad">
      <header style={{ marginBottom: 24 }}>
        <h1>الملف الشخصي</h1>
        <p className="lede">حدّث اسمك ونبذتك وصورتك. بقية الحقول محمية ولا يمكن تغييرها من هنا.</p>
      </header>

      <div className="card">
        <div className="profile-edit__head">
          <Avatar name={displayName} photoURL={photoURL || null} size={72} className="profile-edit__avatar" />
          <div>
            <p className="card__hint">المعاينة</p>
            <p className="profile-edit__name">{displayName || (userDoc?.username ? `@${userDoc.username}` : 'عضو')}</p>
            {userDoc?.username && (
              <p className="card__hint" dir="ltr">@{userDoc.username}</p>
            )}
          </div>
        </div>

        {userDoc?.username && (
          <p className="card__hint" style={{ marginBottom: 16 }}>
            اسم المستخدم: <span dir="ltr" style={{ color: 'var(--text)' }}>@{userDoc.username}</span>
            <span style={{ marginInlineStart: 8 }}>(غير قابل للتعديل)</span>
          </p>
        )}

        {error && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="me-name">الاسم</label>
            <input
              id="me-name"
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, PROFILE_LIMITS.DISPLAY_NAME_MAX))}
              maxLength={PROFILE_LIMITS.DISPLAY_NAME_MAX}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="me-bio">نبذة</label>
            <textarea
              id="me-bio"
              className="textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, PROFILE_LIMITS.BIO_MAX))}
              maxLength={PROFILE_LIMITS.BIO_MAX}
              placeholder="اكتب نبذة قصيرة عنك (اختياري)."
            />
            <div className="field__counter" aria-live="polite">{bio.length} / {PROFILE_LIMITS.BIO_MAX}</div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="me-photo">رابط الصورة</label>
            <input
              id="me-photo"
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
            <label className="field__label" htmlFor="me-cover">رابط صورة الغلاف (اختياري)</label>
            <input
              id="me-cover"
              className="input"
              type="url"
              value={coverURL}
              onChange={(e) => setCoverURL(e.target.value.slice(0, PROFILE_LIMITS.COVER_URL_MAX))}
              maxLength={PROFILE_LIMITS.COVER_URL_MAX}
              placeholder="https://…"
              dir="ltr"
              autoComplete="off"
            />
            <p className="card__hint" style={{ marginTop: 2 }}>يظهر في الجزء العلوي من ملفك الشخصي.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? 'جاري الحفظ…' : 'حفظ التغييرات'}
            </Button>
            {userDoc?.username && (
              <Link to={`/profile/${encodeURIComponent(userDoc.username)}`} className="btn btn--ghost btn--lg">
                عرض ملفي العام
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Account information — read-only. Spec: "email display (read only),
          username display (read only)". Password fields are not exposed. */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="card__title" style={{ marginBottom: 12 }}>معلومات الحساب</h2>
        <dl className="account-info">
          <div className="account-info__row">
            <dt>البريد الإلكتروني</dt>
            <dd dir="ltr">{user.email ?? '—'}</dd>
          </div>
          <div className="account-info__row">
            <dt>اسم المستخدم</dt>
            <dd dir="ltr">{userDoc?.username ? `@${userDoc.username}` : <em style={{ color: 'var(--text-3)' }}>غير محجوز</em>}</dd>
          </div>
          <div className="account-info__row">
            <dt>الحالة</dt>
            <dd>{userDoc?.role === 'admin' ? 'إداري' : 'عضو'}</dd>
          </div>
          <div className="account-info__row">
            <dt>تاريخ الانضمام</dt>
            <dd><TimeAgo value={userDoc?.createdAt ?? null} /></dd>
          </div>
        </dl>
        <p className="card__hint" style={{ marginTop: 12 }}>
          لا يمكن تعديل البريد الإلكتروني واسم المستخدم من هنا. تواصل مع الإدارة إن احتجت لذلك.
        </p>
      </div>
    </div>
  );
}
