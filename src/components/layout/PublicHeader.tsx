import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconBulb, IconForum, IconHome, IconInfo, IconBook, IconMenu, IconClose, IconBell, IconLink } from '../ui/Icons';
import { AccountMenu } from '../user/AccountMenu';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';

const NAV = [
  { to: '/', label: 'الرئيسية', icon: IconHome, end: true },
  { to: '/forum', label: 'المنتدى', icon: IconForum },
  { to: '/ideas', label: 'الأفكار', icon: IconBulb },
  { to: '/about', label: 'حول', icon: IconInfo },
  { to: '/links', label: 'الروابط', icon: IconLink },
  { to: '/guidelines', label: 'القواعد', icon: IconBook }
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { user, userDoc, signOut } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [user]);

  const navigate = useNavigate();

  const onMobileSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
    } catch {
      // signOut is best-effort; still navigate home.
    }
    navigate('/', { replace: true });
  };

  return (
    <header className="site-header yh-floating">
      <div className="container site-header__inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)} aria-label="YassineTia Hub — الصفحة الرئيسية">
          <img src="/logo.png" alt="" className="brand__logo" width={32} height={32} />
          <span className="brand__name">
            YassineTia Hub
            <small>مجتمع</small>
          </span>
        </Link>

        <nav className={open ? 'nav is-open' : 'nav'} aria-label="الرئيسية">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => 'nav__link' + (isActive ? ' is-active' : '')}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} style={{ marginInlineEnd: 6, verticalAlign: '-3px' }} />
                {item.label}
              </NavLink>
            );
          })}
          {user ? (
            <>
              <Link
                to="/notifications"
                className="header-bell"
                aria-label="الإشعارات"
                onClick={() => setOpen(false)}
              >
                <IconBell />
                <NotificationsBadge />
              </Link>
              <AccountMenu />
            </>
          ) : (
            <>
              <Link to="/login" className="nav__link" onClick={() => setOpen(false)}>
                تسجيل الدخول
              </Link>
              <Link to="/signup" className="nav__link nav__link--cta" onClick={() => setOpen(false)}>
                إنشاء حساب
              </Link>
            </>
          )}
        </nav>

        {user && (
          <div className="site-header__mobile-user" aria-hidden={!open}>
            <Link
              to={userDoc?.username ? `/profile/${encodeURIComponent(userDoc.username)}` : '/me'}
              className="site-header__mobile-profile"
              onClick={() => setOpen(false)}
            >
              ملفي الشخصي
            </Link>
            <button
              type="button"
              className="btn btn--danger"
              onClick={onMobileSignOut}
            >
              تسجيل الخروج
            </button>
          </div>
        )}

        <button
          className="nav-toggle"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>
    </header>
  );
}

function NotificationsBadge() {
  const count = useUnreadNotificationsCount();
  if (count <= 0) return null;
  return (
    <span className="header-bell__count" aria-label={`${count} إشعار غير مقروء`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
