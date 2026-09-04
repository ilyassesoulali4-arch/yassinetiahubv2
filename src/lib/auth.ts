import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type Auth,
  type User,
  type UserCredential
} from 'firebase/auth';
import { auth } from './firebase';

export type AuthErrorCode =
  | 'invalid-credentials'
  | 'user-not-found'
  | 'wrong-password'
  | 'email-in-use'
  | 'weak-password'
  | 'invalid-email'
  | 'too-many-requests'
  | 'user-disabled'
  | 'network-error'
  | 'unknown';

export function mapAuthError(err: unknown): { code: AuthErrorCode; message: string } {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return { code: 'invalid-credentials', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    case 'auth/user-not-found':
      return { code: 'user-not-found', message: 'لا يوجد حساب مرتبط بهذا البريد.' };
    case 'auth/wrong-password':
      return { code: 'wrong-password', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    case 'auth/email-already-in-use':
      return { code: 'email-in-use', message: 'هذا البريد مستخدم لحساب آخر.' };
    case 'auth/weak-password':
      return { code: 'weak-password', message: 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.' };
    case 'auth/invalid-email':
      return { code: 'invalid-email', message: 'صيغة البريد الإلكتروني غير صحيحة.' };
    case 'auth/too-many-requests':
      return { code: 'too-many-requests', message: 'تم تجاوز عدد المحاولات، حاول لاحقًا.' };
    case 'auth/user-disabled':
      return { code: 'user-disabled', message: 'تم تعطيل هذا الحساب.' };
    case 'auth/network-request-failed':
      return { code: 'network-error', message: 'تعذّر الاتصال بالخدمة. تحقّق من الإنترنت وحاول مجددًا.' };
    case 'auth/missing-email':
      return { code: 'invalid-email', message: 'يرجى إدخال البريد الإلكتروني.' };
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return { code: 'invalid-email', message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية.' };
    case 'auth/popup-closed-by-user':
      return { code: 'unknown', message: 'تم إلغاء عملية تسجيل الدخول.' };
    case 'auth/popup-blocked':
      return { code: 'unknown', message: 'تم حظر نافذة تسجيل الدخول. تحقّق من إعدادات المتصفح.' };
    case 'auth/cancelled-popup-request':
      return { code: 'unknown', message: 'تم إلغاء عملية تسجيل الدخول.' };
    case 'auth/account-exists-with-different-credential':
      return { code: 'email-in-use', message: 'هذا البريد مسجّل بطريقة دخول أخرى. سجّل الدخول بنفس الطريقة.' };
    case 'auth/requires-recent-login':
      return { code: 'unknown', message: 'تحتاج إلى إعادة تسجيل الدخول لإتمام هذه العملية.' };
    default:
      return { code: 'unknown', message: 'حدث خطأ غير متوقع. حاول مجددًا.' };
  }
}

export async function signIn(email: string, password: string, a: Auth = auth): Promise<UserCredential> {
  return signInWithEmailAndPassword(a, email, password);
}

export async function signUp(email: string, password: string, a: Auth = auth): Promise<UserCredential> {
  return createUserWithEmailAndPassword(a, email, password);
}

export async function signOut(a: Auth = auth): Promise<void> {
  await fbSignOut(a);
}

export async function resetPassword(email: string, a: Auth = auth): Promise<void> {
  return sendPasswordResetEmail(a, email);
}

export async function signInWithGoogle(a: Auth = auth): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(a, provider);
}

export type { User };

