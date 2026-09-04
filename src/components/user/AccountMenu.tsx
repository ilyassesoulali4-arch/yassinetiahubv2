import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from './Avatar';

export function AccountMenu() {
  const { user, userDoc, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const display = userDoc?.displayName?.trim() || user.displayName || user.email || 'عضو';
  const username = userDoc?.username ?? null;
  const profileHref = username ? `/profile/${encodeURIComponent(username)}` : '/me';

  const navigate = useNavigate();

  const onSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch {
      // signOut is best-effort; still navigate home.
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="account-menu" ref={wrapRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="قائمة الحساب"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={display} photoURL={userDoc?.photoURL ?? user.photoURL} size={28} />
      </button>
      {open && (
        <div className="account-menu__panel" role="menu" ref={menuRef}>
          <div className="account-menu__head">
            <div className="account-menu__name">{display}</div>
            {username && <div className="account-menu__username" dir="ltr">@{username}</div>}
            {!username && <div className="account-menu__username">بدون اسم مستخدم</div>}
          </div>
          <Link to={profileHref} className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            ملفي الشخصي
          </Link>
          <Link to="/me" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            تعديل الملف
          </Link>
          <Link to="/notifications" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            الإشعارات
          </Link>
          {userDoc?.role === 'admin' && (
            <Link to="/admin" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
              لوحة الإدارة
            </Link>
          )}
          <div className="account-menu__sep" />
          <button
            type="button"
            className="account-menu__item account-menu__item--danger"
            role="menuitem"
            onClick={onSignOut}
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}
