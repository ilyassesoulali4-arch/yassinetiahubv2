import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isFollowing, followUser, unfollowUser, FollowError } from '../../lib/firestore/follows';
import { emitNotification, messageForFollow } from '../../lib/firestore/notify';
import { mapFsError } from '../../lib/firestore/util';
import { pushToast } from '../ui/Toast';

interface FollowButtonProps {
  targetUid: string;
  /** Optional pre-known state. Useful if parent already fetched it. */
  initialFollowing?: boolean;
  size?: 'md' | 'sm';
}

export function FollowButton({ targetUid, initialFollowing, size = 'md' }: FollowButtonProps) {
  const { user, userDoc } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(initialFollowing ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || user.uid === targetUid) {
        setFollowing(false);
        return;
      }
      try {
        const v = await isFollowing(user.uid, targetUid);
        if (!cancelled) setFollowing(v);
      } catch {
        if (!cancelled) setFollowing(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, targetUid]);

  if (!user) {
    return (
      <a className="btn btn--ghost" href="#/login" aria-label="سجّل الدخول للمتابعة">
        تسجيل الدخول للمتابعة
      </a>
    );
  }
  if (user.uid === targetUid) return null;

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await unfollowUser(user.uid, targetUid);
        setFollowing(false);
      } else {
        await followUser(user.uid, targetUid);
        setFollowing(true);
        // Emit notification (best-effort, never blocks).
        const display = userDoc?.displayName?.trim() || user.displayName || user.email || 'عضو';
        await emitNotification({
          recipientId: targetUid,
          actorId: user.uid,
          actorUsername: userDoc?.username ?? null,
          actorDisplayName: display,
          actorAvatar: userDoc?.photoURL ?? user.photoURL ?? null,
          kind: 'new_follower',
          targetType: 'user',
          targetId: user.uid,
          message: messageForFollow(display)
        });
      }
    } catch (err) {
      if (err instanceof FollowError) {
        pushToast(err.message, 'error');
      } else {
        pushToast(mapFsError(err), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const cls = 'btn ' + (following ? 'btn--ghost' : 'btn--primary') + (size === 'sm' ? '' : ' btn--lg');
  void userDoc;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={busy || following === null}>
      {following ? 'تتابعه' : 'متابعة'}
    </button>
  );
}
