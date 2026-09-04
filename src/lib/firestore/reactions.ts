import {
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { ideaDoc, postDoc, reactionDoc } from './ref';
import { emitNotification, messageForUpvote } from './notify';
import type { ParentType, ReactionCounts, ReactionType } from './types';
import { REACTION_TYPES } from './types';

/**
 * Reaction document ID convention from the architecture:
 *   `${userId}_${targetType}_${targetId}`
 * This guarantees uniqueness per (user, target) without an extra read.
 * One reaction per user per target: if the user picks a different emoji
 * the existing reaction is replaced atomically.
 */
export function reactionIdFor(userId: string, targetType: ParentType, targetId: string): string {
  return `${userId}_${targetType}_${targetId}`;
}

function readReactionCounts(snap: { get: (k: string) => unknown } | null | undefined): ReactionCounts {
  if (!snap) return {};
  const v = snap.get('reactionCounts');
  if (!v || typeof v !== 'object') return {};
  return v as ReactionCounts;
}

function sumCounts(counts: ReactionCounts): number {
  let s = 0;
  for (const t of REACTION_TYPES) {
    const n = counts[t];
    if (typeof n === 'number' && n > 0) s += n;
  }
  return s;
}

/**
 * Toggle a reaction atomically.
 * - Reads the reaction document and the target's counters in one transaction.
 * - Same type as before  -> remove + decrement count of that type.
 * - Different type set   -> swap; decrement the old type, increment the new.
 * - No existing reaction -> create + increment the new type.
 * - Maintains `reactionCounts.<type>` and `upvotesCount` (sum total).
 * - Notifications are emitted only when a NEW reaction is created (not
 *   on a swap or toggle-off), so users don't get spammed.
 */
export async function toggleReaction(
  userId: string,
  username: string,
  targetType: ParentType,
  targetId: string,
  type: ReactionType = 'upvote',
  actor?: { displayName?: string | null; avatar?: string | null }
): Promise<{ counts: ReactionCounts; myVote: ReactionType | null; recipientId?: string | null }> {
  if (!REACTION_TYPES.includes(type)) {
    throw new Error('INVALID_REACTION_TYPE');
  }
  const ref = reactionDoc(reactionIdFor(userId, targetType, targetId));
  const targetRef = targetType === 'post' ? postDoc(targetId) : ideaDoc(targetId);

  const result = await runTransaction(db, async (tx) => {
    const [rxSnap, targetSnap] = await Promise.all([tx.get(ref), tx.get(targetRef)]);
    if (!targetSnap.exists()) {
      throw new Error('TARGET_NOT_FOUND');
    }
    const prevType: ReactionType | null = rxSnap.exists() ? ((rxSnap.get('type') as ReactionType) ?? null) : null;
    const authorId: string | null = (targetSnap.get('authorId') as string | null | undefined) ?? null;
    const prevCounts = readReactionCounts(targetSnap);
    const nextCounts: ReactionCounts = { ...prevCounts };

    let nextVote: ReactionType | null = type;
    let isNewReaction = false;

    if (prevType === type) {
      // toggle off
      tx.delete(ref);
      const prev = nextCounts[type] ?? 0;
      nextCounts[type] = Math.max(0, prev - 1);
      nextVote = null;
    } else {
      // create or replace
      if (prevType && prevType !== type) {
        // swap: decrement old type
        const prevOld = nextCounts[prevType] ?? 0;
        nextCounts[prevType] = Math.max(0, prevOld - 1);
      }
      // increment new type
      const prevNew = nextCounts[type] ?? 0;
      nextCounts[type] = prevNew + 1;
      tx.set(ref, {
        userId,
        username,
        targetType,
        targetId,
        type,
        createdAt: serverTimestamp()
      });
      isNewReaction = prevType == null;
    }

    const newTotal = sumCounts(nextCounts);
    tx.update(targetRef, {
      upvotesCount: newTotal,
      reactionCounts: nextCounts,
      lastActivityAt: serverTimestamp()
    });

    return { counts: nextCounts, myVote: nextVote, recipientId: authorId, wasToggledOn: isNewReaction };
  });

  // Best-effort notification when a brand-new reaction is cast (not on swap,
  // not on toggle-off). Only for the 'upvote' type to avoid noise from
  // heart / fire / clap spam.
  if (result.wasToggledOn && type === 'upvote' && result.recipientId && result.recipientId !== userId) {
    const display = actor?.displayName?.trim() || username || 'عضو';
    await emitNotification({
      recipientId: result.recipientId,
      actorId: userId,
      actorUsername: username || null,
      actorDisplayName: display,
      actorAvatar: actor?.avatar ?? null,
      kind: 'upvote',
      targetType,
      targetId,
      message: messageForUpvote(display, targetType)
    });
  }

  return { counts: result.counts, myVote: result.myVote, recipientId: result.recipientId };
}

/** Read a single user's current vote on a target (if any). */
export async function getMyReaction(
  userId: string,
  targetType: ParentType,
  targetId: string
): Promise<ReactionType | null> {
  const snap = await getDoc(reactionDoc(reactionIdFor(userId, targetType, targetId)));
  if (!snap.exists()) return null;
  return (snap.get('type') as ReactionType) ?? null;
}
