import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { normalizeUsername } from './util';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export class UsernameError extends Error {
  code: 'invalid' | 'taken' | 'self-reserved';
  constructor(code: 'invalid' | 'taken' | 'self-reserved', message: string) {
    super(message);
    this.code = code;
  }
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(normalizeUsername(value));
}

/**
 * Atomically reserve a username for a given uid.
 * Throws UsernameError('taken') if already taken.
 * Throws UsernameError('invalid') if the format is invalid.
 * Throws UsernameError('self-reserved') if a different uid already owns it.
 */
export async function reserveUsername(uid: string, username: string): Promise<void> {
  const normalized = normalizeUsername(username);
  if (!USERNAME_RE.test(normalized)) {
    throw new UsernameError('invalid', 'اسم المستخدم يجب أن يكون 3-20 حرفًا (حروف إنجليزية صغيرة، أرقام، underscore).');
  }
  const ref = doc(db, 'usernames', normalized);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const owner = snap.get('uid') as string | undefined;
      if (owner && owner !== uid) {
        throw new UsernameError('taken', 'اسم المستخدم محجوز مسبقًا.');
      }
      // already owned by same user — no-op
      return;
    }
    tx.set(ref, {
      username: normalized,
      uid,
      createdAt: serverTimestamp()
    });
  });
}

/** Release a username reservation if the caller is the owner. */
export async function releaseUsername(username: string, uid: string): Promise<void> {
  const ref = doc(db, 'usernames', normalizeUsername(username));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    if (snap.get('uid') !== uid) return;
    tx.delete(ref);
  });
}

export async function getUsernameOwner(username: string): Promise<string | null> {
  const ref = doc(db, 'usernames', normalizeUsername(username));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return (snap.get('uid') as string | undefined) ?? null;
}
