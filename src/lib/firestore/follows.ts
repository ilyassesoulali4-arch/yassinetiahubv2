import {
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { followDoc, userDoc } from './ref';

export class FollowError extends Error {
  code: 'self' | 'already' | 'not-found';
  constructor(code: 'self' | 'already' | 'not-found', message: string) {
    super(message);
    this.code = code;
  }
}

/** Deterministic id: ${followerId}_${followeeId}. */
export function followIdFor(followerId: string, followeeId: string): string {
  return `${followerId}_${followeeId}`;
}

/** Read the cached count, defaulting to 0 when missing. */
function readCount(snap: { get: (k: string) => unknown } | null | undefined, key: string): number {
  if (!snap) return 0;
  const v = (snap as { get: (k: string) => unknown }).get(key);
  return typeof v === 'number' ? v : 0;
}

/**
 * Create a follow and atomically update the cached `followersCount` /
 * `followingCount` on both users. The Firestore Rules enforce a strict
 * ±1 delta on those fields, so the counter cannot drift.
 */
export async function followUser(followerId: string, followeeId: string): Promise<void> {
  if (followerId === followeeId) {
    throw new FollowError('self', 'لا يمكنك متابعة نفسك.');
  }
  const ref = followDoc(followIdFor(followerId, followeeId));
  const followerRef = userDoc(followerId);
  const followeeRef = userDoc(followeeId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return; // idempotent
    const [followerSnap, followeeSnap] = await Promise.all([
      tx.get(followerRef),
      tx.get(followeeRef)
    ]);
    const prevFollowing = readCount(followerSnap, 'followingCount');
    const prevFollowers = readCount(followeeSnap, 'followersCount');
    tx.set(ref, {
      followerId,
      followeeId,
      createdAt: serverTimestamp()
    });
    tx.update(followerRef, {
      followingCount: prevFollowing + 1,
      updatedAt: serverTimestamp()
    });
    tx.update(followeeRef, {
      followersCount: prevFollowers + 1,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Remove a follow and atomically decrement the cached counters. The
 * Rules clamp counters at non-negative values via the ±1 delta rule.
 */
export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  const ref = followDoc(followIdFor(followerId, followeeId));
  const followerRef = userDoc(followerId);
  const followeeRef = userDoc(followeeId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const [followerSnap, followeeSnap] = await Promise.all([
      tx.get(followerRef),
      tx.get(followeeRef)
    ]);
    const prevFollowing = readCount(followerSnap, 'followingCount');
    const prevFollowers = readCount(followeeSnap, 'followersCount');
    tx.delete(ref);
    tx.update(followerRef, {
      followingCount: Math.max(0, prevFollowing - 1),
      updatedAt: serverTimestamp()
    });
    tx.update(followeeRef, {
      followersCount: Math.max(0, prevFollowers - 1),
      updatedAt: serverTimestamp()
    });
  });
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const snap = await getDoc(followDoc(followIdFor(followerId, followeeId)));
  return snap.exists();
}
