import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UserDoc {
  uid: string;
  email: string;
  username: string | null;
  displayName: string;
  photoURL: string | null;
  coverURL?: string | null;
  bio?: string;
  createdAt: unknown;
  updatedAt: unknown;
  lastSeenAt?: unknown;
  // Fields that ONLY the server (or admin SDK / console) can write:
  // - role: 'user' | 'admin'
  // - status: 'active' | 'banned'
  // - *_Count counters
  role?: 'user' | 'admin';
  status?: 'active' | 'banned';
  postsCount?: number;
  ideasCount?: number;
  commentsCount?: number;
}

const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 280;
const PHOTO_URL_MAX = 500;
const COVER_URL_MAX = 500;

export interface CreateUserDocInput {
  uid: string;
  email: string;
  displayName: string;
  username?: string | null;
  photoURL?: string | null;
  coverURL?: string | null;
  bio?: string | null;
}

export interface UpdateOwnProfileInput {
  displayName?: string;
  bio?: string | null;
  photoURL?: string | null;
  coverURL?: string | null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function validateDisplayName(value: string): void {
  const v = value.trim();
  if (v.length < DISPLAY_NAME_MIN || v.length > DISPLAY_NAME_MAX) {
    throw new Error(`الاسم يجب أن يكون بين ${DISPLAY_NAME_MIN} و ${DISPLAY_NAME_MAX} حرفًا.`);
  }
}

function validateBio(value: string | null | undefined): void {
  if (value === undefined || value === null) return;
  if (value.length > BIO_MAX) {
    throw new Error(`النبذة يجب ألا تتجاوز ${BIO_MAX} حرفًا.`);
  }
}

function validatePhotoURL(value: string | null | undefined): void {
  if (value === undefined || value === null || value === '') return;
  if (value.length > PHOTO_URL_MAX) {
    throw new Error('رابط الصورة طويل جدًا.');
  }
  if (!isHttpUrl(value)) {
    throw new Error('يجب أن يكون رابط الصورة http(s).');
  }
}

function validateCoverURL(value: string | null | undefined): void {
  if (value === undefined || value === null || value === '') return;
  if (value.length > COVER_URL_MAX) {
    throw new Error('رابط صورة الغلاف طويل جدًا.');
  }
  if (!isHttpUrl(value)) {
    throw new Error('يجب أن يكون رابط صورة الغلاف http(s).');
  }
}

export function validateCreateUser(input: CreateUserDocInput): void {
  validateDisplayName(input.displayName);
  validateBio(input.bio);
  validatePhotoURL(input.photoURL);
  validateCoverURL(input.coverURL);
}

/**
 * Creates the safe minimum user document after a successful sign-up.
 * The role field defaults to 'user' at write time and is NOT settable
 * from the frontend after this point.
 */
export async function createUserDoc(input: CreateUserDocInput): Promise<void> {
  validateCreateUser(input);
  const ref = doc(db, 'users', input.uid);
  const payload = {
    uid: input.uid,
    email: input.email,
    username: input.username ?? null,
    displayName: input.displayName.trim(),
    photoURL: input.photoURL ?? null,
    coverURL: input.coverURL ?? null,
    bio: (input.bio ?? '').trim() || null,
    role: 'user',
    status: 'active',
    postsCount: 0,
    ideasCount: 0,
    commentsCount: 0,
    followersCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, payload);
}

/**
 * Update only the safe fields permitted by the Firestore Rules.
 * The Rules re-validate this; client-side validation is UX.
 */
export async function updateOwnProfile(uid: string, input: UpdateOwnProfileInput): Promise<void> {
  if (input.displayName !== undefined) validateDisplayName(input.displayName);
  if (input.bio !== undefined) validateBio(input.bio);
  if (input.photoURL !== undefined) validatePhotoURL(input.photoURL);
  if (input.coverURL !== undefined) validateCoverURL(input.coverURL);
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.displayName !== undefined) patch.displayName = input.displayName.trim();
  if (input.bio !== undefined) patch.bio = input.bio === null ? null : input.bio.trim();
  if (input.photoURL !== undefined) {
    const v = input.photoURL;
    patch.photoURL = v === null || v === '' ? null : v.trim();
  }
  if (input.coverURL !== undefined) {
    const v = input.coverURL;
    patch.coverURL = v === null || v === '' ? null : v.trim();
  }
  await updateDoc(doc(db, 'users', uid), patch);
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export const PROFILE_LIMITS = {
  DISPLAY_NAME_MIN,
  DISPLAY_NAME_MAX,
  BIO_MAX,
  PHOTO_URL_MAX,
  COVER_URL_MAX
};
