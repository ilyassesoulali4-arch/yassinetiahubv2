import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { achievementsCol, challengesCol } from './ref';
import type { AchievementDoc, ChallengeDoc } from './types';

const ACHIEVEMENT_TITLE_MIN = 5;
const ACHIEVEMENT_TITLE_MAX = 120;
const ACHIEVEMENT_DESC_MIN = 10;
const ACHIEVEMENT_DESC_MAX = 500;

const CHALLENGE_TITLE_MIN = 5;
const CHALLENGE_TITLE_MAX = 120;
const CHALLENGE_DESC_MIN = 10;
const CHALLENGE_DESC_MAX = 1000;
const CHALLENGE_REWARD_MAX = 200;

export interface CreateAchievementInput {
  authorId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatar?: string | null;
  category: AchievementDoc['category'];
  title: string;
  description: string;
}

export function validateAchievement(input: CreateAchievementInput): void {
  const t = input.title.trim();
  const d = input.description.trim();
  if (t.length < ACHIEVEMENT_TITLE_MIN || t.length > ACHIEVEMENT_TITLE_MAX) {
    throw new Error(`عنوان الإنجاز يجب أن يكون بين ${ACHIEVEMENT_TITLE_MIN} و ${ACHIEVEMENT_TITLE_MAX} حرفًا.`);
  }
  if (d.length < ACHIEVEMENT_DESC_MIN || d.length > ACHIEVEMENT_DESC_MAX) {
    throw new Error(`وصف الإنجاز يجب أن يكون بين ${ACHIEVEMENT_DESC_MIN} و ${ACHIEVEMENT_DESC_MAX} حرفًا.`);
  }
}

/**
 * Create a member achievement. Rules enforce that:
 * - authorId (when present) == request.auth.uid
 * - role/status are not writeable from the client
 */
export async function createAchievement(input: CreateAchievementInput): Promise<string> {
  validateAchievement(input);
  const ref = await addDoc(achievementsCol, {
    id: 'a_' + Math.random().toString(36).slice(2, 10),
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorDisplayName: input.authorDisplayName,
    authorAvatar: input.authorAvatar ?? null,
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** Live: latest N achievements across the community. */
export function subscribeRecentAchievements(
  onNext: (items: AchievementDoc[]) => void,
  onError?: (err: unknown) => void,
  pageSize = 8
): () => void {
  const q = query(achievementsCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      const items: AchievementDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AchievementDoc, 'id'>) }));
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

export async function listRecentAchievements(pageSize = 8): Promise<AchievementDoc[]> {
  const q = query(achievementsCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AchievementDoc, 'id'>) }));
}

export interface CreateChallengeInput {
  title: string;
  description: string;
  deadline?: string | null;
  reward?: string | null;
  isActive?: boolean;
  createdBy: string;
}

export function validateChallenge(input: CreateChallengeInput): void {
  const t = input.title.trim();
  const d = input.description.trim();
  if (t.length < CHALLENGE_TITLE_MIN || t.length > CHALLENGE_TITLE_MAX) {
    throw new Error(`عنوان التحدي يجب أن يكون بين ${CHALLENGE_TITLE_MIN} و ${CHALLENGE_TITLE_MAX} حرفًا.`);
  }
  if (d.length < CHALLENGE_DESC_MIN || d.length > CHALLENGE_DESC_MAX) {
    throw new Error(`وصف التحدي يجب أن يكون بين ${CHALLENGE_DESC_MIN} و ${CHALLENGE_DESC_MAX} حرفًا.`);
  }
  if (input.reward && input.reward.length > CHALLENGE_REWARD_MAX) {
    throw new Error('وصف المكافأة طويل جدًا.');
  }
}

/**
 * Create a challenge. The Rules require `createdBy == request.auth.uid` and
 * that the caller is admin (isAdmin()). On the client, this is intended
 * to be called from the admin page only.
 */
export async function createChallenge(input: CreateChallengeInput): Promise<string> {
  validateChallenge(input);
  const ref = await addDoc(challengesCol, {
    id: 'c_' + Math.random().toString(36).slice(2, 10),
    title: input.title.trim(),
    description: input.description.trim(),
    deadline: input.deadline ?? null,
    reward: input.reward ?? null,
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    createdBy: input.createdBy
  });
  return ref.id;
}

/** Live: currently active challenge. May be null if none is set. */
export function subscribeActiveChallenge(
  onNext: (challenge: ChallengeDoc | null) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(challengesCol, where('isActive', '==', true), limitFn(1));
  return onSnapshot(
    q,
    (snap) => {
      const first = snap.docs[0];
      onNext(first ? ({ id: first.id, ...(first.data() as Omit<ChallengeDoc, 'id'>) }) : null);
    },
    (err) => onError?.(err)
  );
}

export async function getActiveChallenge(): Promise<ChallengeDoc | null> {
  const q = query(challengesCol, where('isActive', '==', true), limitFn(1));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  if (!first) return null;
  return { id: first.id, ...(first.data() as Omit<ChallengeDoc, 'id'>) };
}

export async function deleteAchievement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'achievements', id));
}
