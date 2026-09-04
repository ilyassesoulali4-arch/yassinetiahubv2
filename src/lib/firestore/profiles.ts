import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { userDoc } from './ref';
import type { UserDoc } from './types';

const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_MAX = 50;
const PHOTO_URL_MAX = 500;

export interface UpdateOwnProfileInput {
  displayName?: string;
  photoURL?: string | null;
}

export function validateProfileUpdate(input: UpdateOwnProfileInput): void {
  if (input.displayName !== undefined) {
    const d = input.displayName.trim();
    if (d.length < DISPLAY_NAME_MIN || d.length > DISPLAY_NAME_MAX) {
      throw new Error('الاسم يجب أن يكون بين 1 و 50 حرفًا.');
    }
  }
  if (input.photoURL !== undefined && input.photoURL !== null) {
    if (input.photoURL.length > PHOTO_URL_MAX) {
      throw new Error('رابط الصورة طويل جدًا.');
    }
  }
}

/**
 * Update only the safe fields permitted by the Firestore Rules.
 * The server-side rules re-validate this; client-side validation is UX.
 */
export async function updateOwnProfile(uid: string, input: UpdateOwnProfileInput): Promise<void> {
  validateProfileUpdate(input);
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.displayName !== undefined) patch.displayName = input.displayName.trim();
  if (input.photoURL !== undefined) patch.photoURL = input.photoURL;
  await updateDoc(userDoc(uid), patch);
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<UserDoc, 'uid'>), uid: snap.id };
}

/**
 * Look up a user by their reserved username. The doc id of `usernames` is the
 * lowercased username; the doc body holds the uid. Two reads (one cheap).
 */
export async function getUidByUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  const ref = doc(db, 'usernames', normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return (snap.get('uid') as string | undefined) ?? null;
}
