import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeNotifications, type NotificationDoc } from '../lib/firestore';

/** Returns the live count of unread notifications for the current user. */
export function useUnreadNotificationsCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) { setCount(0); return; }
    const off = subscribeNotifications(
      user.uid,
      (items: NotificationDoc[]) => setCount(items.filter((n: NotificationDoc) => !n.read).length),
      () => setCount(0)
    );
    return () => off();
  }, [user]);
  return count;
}
