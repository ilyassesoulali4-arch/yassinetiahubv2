import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  signIn as fbSignIn,
  signUp as fbSignUp,
  signOut as fbSignOut,
  signInWithGoogle as fbSignInWithGoogle,
  resetPassword as fbResetPassword,
  mapAuthError
} from '../lib/auth';
import { createUserDoc, getUserDoc, type UserDoc, type CreateUserDocInput, validateCreateUser, updateOwnProfile } from '../lib/users';
import { reserveUsername, UsernameError, isValidUsername } from '../lib/firestore/usernames';
import { normalizeUsername } from '../lib/firestore/util';

export interface AuthContextValue {
  user: User | null;
  userDoc: UserDoc | null;
  isAdmin: boolean;
  /** Alias for !bootstrapDone. Kept for backward compatibility. */
  loading: boolean;
  /** True until the very first `onAuthStateChanged` resolution has settled. */
  bootstrapDone: boolean;
  /** True when the current user has the required profile fields. */
  isOnboarded: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: { email: string; password: string; displayName: string; username: string }) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Ensure the Firestore `users/{uid}` doc exists for the given user.
   * If absent, creates it with safe defaults.
   * If a `username` is supplied, it is reserved transactionally first;
   * the user doc is created on success. The username reservation will
   * fail with a UsernameError if already taken.
   */
  ensureUserDoc: (u: User, opts?: { username?: string }) => Promise<void>;
  /**
   * Save the onboarding profile fields. Reserves the username
   * transactionally. Fails with UsernameError on collision.
   */
  completeOnboarding: (input: { displayName: string; username: string; photoURL?: string | null; coverURL?: string | null; bio?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Profile completeness check. The two required fields are `displayName`
 * (non-empty, after trim) and `username` (normalized and within the
 * allowed format). We do not introduce a `profileCompleted` boolean:
 * the existing fields are enough to drive routing without ambiguity.
 */
export function isProfileOnboarded(doc: UserDoc | null): boolean {
  if (!doc) return false;
  const dn = (doc.displayName ?? '').trim();
  const un = (doc.username ?? '').trim();
  if (dn.length === 0) return false;
  if (un.length === 0) return false;
  if (!isValidUsername(un)) return false;
  return true;
}

/**
 * Convert a Firebase Auth User into a safe `createUserDoc` input.
 * Falls back to "عضو" if no displayName is available.
 */
function deriveCreateInput(u: User, username?: string | null): CreateUserDocInput {
  return {
    uid: u.uid,
    email: u.email ?? '',
    displayName: (u.displayName && u.displayName.trim()) || (u.email ? u.email.split('@')[0] : 'عضو'),
    username: username ?? null,
    photoURL: u.photoURL ?? null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  // `bootstrapDone` is the authoritative "is the initial auth state
  // resolution complete?" signal. `loading` is the legacy alias kept so
  // existing pages that read `useAuth().loading` keep working.
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [loading, setLoading] = useState(true);

  // Track the in-flight user-doc load to avoid races on auth changes.
  const loadToken = useRef(0);
  // A ref-mirror of bootstrapDone so the effect closure can update it
  // without re-subscribing to onAuthStateChanged.
  const bootstrapDoneRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const token = ++loadToken.current;
      setUser(u);
      if (!u) {
        setUserDoc(null);
        setLoading(false);
        if (!bootstrapDoneRef.current) {
          bootstrapDoneRef.current = true;
          setBootstrapDone(true);
        }
        return;
      }
      setLoading(true);
      // Lazily fetch the user doc. If it doesn't exist (e.g. a stale auth
      // session from before Phase 4 or a brand-new Google sign-in where
      // we haven't yet provisioned the doc), surface `null` — the
      // explicit "ensureUserDoc" path will create it.
      getUserDoc(u.uid)
        .then((d) => {
          if (token !== loadToken.current) return; // a newer auth change superseded us
          setUserDoc(d);
        })
        .catch(() => {
          if (token !== loadToken.current) return;
          setUserDoc(null);
        })
        .finally(() => {
          if (token !== loadToken.current) return;
          setLoading(false);
          if (!bootstrapDoneRef.current) {
            bootstrapDoneRef.current = true;
            setBootstrapDone(true);
          }
        });
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const cred = await fbSignIn(email, password);
      return cred.user;
    } catch (err) {
      throw mapAuthError(err);
    }
  };

  const ensureUserDoc = async (u: User, opts?: { username?: string }): Promise<void> => {
    // Reserve the username transactionally (if requested) before
    // creating the user doc. Username must be valid; we never make one up.
    let reservedUsername: string | null = null;
    if (opts?.username !== undefined) {
      if (opts.username === null || opts.username === '') {
        reservedUsername = null;
      } else {
        const norm = normalizeUsername(opts.username);
        if (!isValidUsername(norm)) {
          throw new UsernameError('invalid', 'اسم المستخدم يجب أن يكون 3-20 حرفًا (حروف إنجليزية صغيرة، أرقام، underscore).');
        }
        await reserveUsername(u.uid, norm);
        reservedUsername = norm;
      }
    }
    // Create the user doc with safe defaults if it doesn't exist.
    const existing = await getUserDoc(u.uid);
    if (existing) {
      // No-op: the doc is the source of truth and is server-protected.
      return;
    }
    const input = deriveCreateInput(u, reservedUsername);
    validateCreateUser(input);
    await createUserDoc(input);
  };

  const signUp = async (input: { email: string; password: string; displayName: string; username: string }): Promise<User> => {
    let cred: User | null = null;
    try {
      const userCred = await fbSignUp(input.email, input.password);
      cred = userCred.user;
      // Provision the user doc + username atomically.
      await ensureUserDoc(cred, { username: input.username });
      return cred;
    } catch (err) {
      // If anything after auth creation fails, roll back the auth account
      // so the username decision is final and no orphan auth user remains.
      if (cred) {
        try { await cred.delete(); } catch { /* ignore */ }
      }
      if (err instanceof UsernameError) throw err;
      throw mapAuthError(err);
    }
  };

  const signInWithGoogle = async (): Promise<User> => {
    try {
      const cred = await fbSignInWithGoogle();
      const u = cred.user;
      // Ensure a Firestore user document exists. Google accounts come with
      // an email and a photoURL; we never fabricate a username — if the
      // account is brand new and has no reserved username, we leave it
      // null and the user can set one from /me.
      try {
        await ensureUserDoc(u);
        // Refresh the cached user doc.
        const fresh = await getUserDoc(u.uid);
        setUserDoc(fresh);
      } catch {
        // If the doc write fails (rules / offline), auth still succeeds.
        // The next onAuthStateChanged will re-attempt.
      }
      return u;
    } catch (err) {
      throw mapAuthError(err);
    }
  };

  const signOut = async (): Promise<void> => {
    // Cancel any pending user-doc load and clear state up front so the UI
    // does not show a stale profile while the network request is in flight.
    loadToken.current++;
    setUser(null);
    setUserDoc(null);
    setLoading(true);
    try {
      await fbSignOut(auth);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await fbResetPassword(email);
    } catch (err) {
      throw mapAuthError(err);
    }
  };

  /**
   * Save the onboarding profile fields. Reserves the username
   * transactionally. If the user doc doesn't exist yet (e.g. a
   * brand-new Google account that just authenticated), this method
   * creates it with the supplied fields. Existing fields that are
   * not part of the safe schema (role, status, counters, etc.) are
   * never written by the client.
   */
  const completeOnboarding = async (input: {
    displayName: string;
    username: string;
    photoURL?: string | null;
    coverURL?: string | null;
    bio?: string | null;
  }): Promise<void> => {
    if (!user) throw new Error('NOT_AUTHENTICATED');
    const norm = normalizeUsername(input.username);
    if (!isValidUsername(norm)) {
      throw new UsernameError('invalid', 'اسم المستخدم يجب أن يكون 3-20 حرفًا (حروف إنجليزية صغيرة، أرقام، underscore).');
    }
    // 1. Reserve the username transactionally. Fails with UsernameError
    //    if already taken. If the current user already owns it, this
    //    is a no-op.
    await reserveUsername(user.uid, norm);
    // 2. Make sure the user doc exists (it may not for a fresh Google
    //    user that authenticated without going through the email flow).
    const existing = await getUserDoc(user.uid);
    if (!existing) {
      const createInput: CreateUserDocInput = {
        uid: user.uid,
        email: user.email ?? '',
        displayName: input.displayName.trim() || (user.displayName ?? user.email ?? 'عضو'),
        username: norm,
        photoURL: input.photoURL ?? user.photoURL ?? null,
        coverURL: input.coverURL ?? null,
        bio: input.bio ?? null
      };
      validateCreateUser(createInput);
      await createUserDoc(createInput);
    } else {
      // 3. Patch only the safe fields on the existing doc. The Firestore
      //    Rules re-validate identity / role / status / counters /
      //    createdAt immutability.
      await updateOwnProfile(user.uid, {
        displayName: input.displayName,
        bio: input.bio ?? null,
        photoURL: input.photoURL ?? null,
        coverURL: input.coverURL ?? null
      });
      // Apply the username field. The Rules permit `username` only on
      // create, not on update; so for users who already had a doc
      // without a username we need to handle the no-op case. The
      // current Rules treat `username` as immutable post-create, so
      // if it is already set we leave it. If the existing doc has
      // no username (e.g. a stale auth user pre-Phase 6), we cannot
      // set it from the client without a rule change. We avoid the
      // write in that case — the new username reservation is still
      // recorded in `usernames/{u}` for visibility.
      if (!existing.username) {
        // Best-effort: try to set the username on the user doc. The Rules
        // permit a one-time backfill when the existing `username` is null
        // (see `firestore.rules`).
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            { username: norm, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } catch {
          // ignore — username reservation already succeeded.
        }
      }
    }
    // 4. Refresh the cached user doc so the UI reflects the new state.
    const fresh = await getUserDoc(user.uid);
    setUserDoc(fresh);
  };

  const value: AuthContextValue = {
    user,
    userDoc,
    isAdmin: userDoc?.role === 'admin' && userDoc?.status !== 'banned',
    loading,
    bootstrapDone,
    isOnboarded: isProfileOnboarded(userDoc),
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    ensureUserDoc,
    completeOnboarding
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
