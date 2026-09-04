import {
  getCountFromServer,
  getDocs,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { followDoc, followsCol } from './ref';

// Re-use the canonical id builder from follows.ts
import { followIdFor } from './follows';

/** Live: is the current viewer following the target? */
export function subscribeIsFollowing(
  followerId: string,
  followeeId: string,
  onNext: (following: boolean) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!followerId || followerId === followeeId) {
    // No-op subscription; subscriber can ignore.
    onNext(false);
    return () => {};
  }
  const ref = followDoc(followIdFor(followerId, followeeId));
  return onSnapshot(
    ref,
    (snap) => onNext(snap.exists()),
    (err) => onError?.(err)
  );
}

/** Live count of followers of a given uid. */
export function subscribeFollowersCount(
  followeeId: string,
  onNext: (count: number) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!followeeId) { onNext(0); return () => {}; }
  const q = query(followsCol, where('followeeId', '==', followeeId));
  return onSnapshot(
    q,
    (snap) => onNext(snap.size),
    (err) => onError?.(err)
  );
}

/** Live count of how many people the given uid is following. */
export function subscribeFollowingCount(
  followerId: string,
  onNext: (count: number) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!followerId) { onNext(0); return () => {}; }
  const q = query(followsCol, where('followerId', '==', followerId));
  return onSnapshot(
    q,
    (snap) => onNext(snap.size),
    (err) => onError?.(err)
  );
}

/** One-shot count of followers (for the admin dashboard, etc.). */
export async function countFollowers(followeeId: string): Promise<number> {
  if (!followeeId) return 0;
  const agg = await getCountFromServer(query(followsCol, where('followeeId', '==', followeeId)));
  return agg.data().count;
}

/** One-shot count of following. */
export async function countFollowing(followerId: string): Promise<number> {
  if (!followerId) return 0;
  const agg = await getCountFromServer(query(followsCol, where('followerId', '==', followerId)));
  return agg.data().count;
}

/** One-shot list of a user's followers. */
export async function listFollowers(followeeId: string, pageSize = 100): Promise<string[]> {
  if (!followeeId) return [];
  const q = query(
    followsCol,
    where('followeeId', '==', followeeId),
    orderBy('createdAt', 'desc'),
    limitFn(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as { followerId: string }).followerId);
}

/** One-shot list of who the user is following. */
export async function listFollowing(followerId: string, pageSize = 100): Promise<string[]> {
  if (!followerId) return [];
  const q = query(
    followsCol,
    where('followerId', '==', followerId),
    orderBy('createdAt', 'desc'),
    limitFn(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as { followeeId: string }).followeeId);
}
