import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDoc
} from '../lib/firestore';
import { mapFsError, toDate } from '../lib/firestore/util';
import { TimeAgo } from '../components/shared/TimeAgo';
import { pushToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/user/Avatar';

export function NotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  // `ready` flips true the first time the onSnapshot callback delivers
  // the initial document set (or an empty set if the user has none).
  // Until then, the page shows a loading state.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    setReady(false);
    const off = subscribeNotifications(
      user.uid,
      (list) => {
        setItems(list);
        setReady(true);
      },
      (err) => {
        setError(mapFsError(err));
        setReady(true);
      }
    );
    return () => off();
  }, [user]);

  if (loading || !ready) {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }} role="status" aria-live="polite">
        <p className="lede">جاري التحميل…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const unread = items.filter((n) => !n.read).length;

  const onMarkAll = async () => {
    if (marking || unread === 0) return;
    setMarking(true);
    try {
      await markAllNotificationsRead(user.uid);
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="container container--narrow page-pad">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1>الإشعارات</h1>
          <p className="lede">{unread > 0 ? `لديك ${unread} إشعار غير مقروء.` : 'كل شيء محدّث.'}</p>
        </div>
        <Button variant="ghost" onClick={onMarkAll} disabled={marking || unread === 0}>
          {marking ? 'جاري التحديث…' : 'تمييز الكل كمقروء'}
        </Button>
      </header>

      {error && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {items.length === 0 && !error ? (
        <div className="card admin-page__empty">لا توجد إشعارات.</div>
      ) : (
        <div className="admin-page__list">
          {items.map((n) => {
            const target = n.targetType === 'idea'
              ? `/ideas#i-${n.targetId}`
              : n.targetType === 'post'
              ? `/forum/${n.targetId}`
              : '/';
            const actorName = n.actorDisplayName || (n.actorUsername ? `@${n.actorUsername}` : null);
            return (
              <article
                key={n.id}
                className="card admin-card"
                style={{ opacity: n.read ? 0.85 : 1 }}
                onClick={async () => {
                  if (!n.read) {
                    try { await markNotificationRead(n.id); } catch { /* no-op */ }
                  }
                }}
              >
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    {n.actorAvatar || actorName ? (
                      <Avatar name={actorName ?? n.message} photoURL={n.actorAvatar ?? null} size={28} />
                    ) : null}
                    {!n.read && <span className="idea-badge idea-badge--planned" aria-label="غير مقروء">جديد</span>}
                    <span className="admin-card__name">{n.message}</span>
                  </div>
                  <TimeAgo value={n.createdAt} className="admin-card__date" />
                </header>
                <footer className="admin-card__foot">
                  <div />
                  <div className="admin-card__actions">
                    <Link to={target} className="btn btn--quiet">فتح</Link>
                  </div>
                </footer>
                {void toDate(n.createdAt)}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
