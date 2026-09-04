import {
  serverTimestamp,
  Timestamp,
  type FieldValue
} from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';

/** Coerce a possibly-Timestamp / FieldValue to a Date, or null. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Coerce a possibly-Timestamp to ms, or null. */
export function toMillis(value: unknown): number | null {
  const d = toDate(value);
  return d ? d.getTime() : null;
}

/** Standard "serverTimestamp()" marker for writes. */
export const now: FieldValue = serverTimestamp();

/** Map common Firestore errors to a clean Arabic message. */
export function mapFsError(err: unknown): string {
  const code = (err as FirebaseError)?.code ?? '';
  switch (code) {
    case 'permission-denied':
      return 'ليس لديك صلاحية لتنفيذ هذه العملية.';
    case 'not-found':
      return 'العنصر غير موجود.';
    case 'already-exists':
      return 'العنصر موجود مسبقًا.';
    case 'failed-precondition':
      return 'تعذّر تنفيذ العملية. حاول لاحقًا.';
    case 'unavailable':
      return 'الخدمة غير متاحة حاليًا. تحقّق من اتصال الإنترنت وحاول مجددًا.';
    case 'cancelled':
      return 'تم إلغاء العملية.';
    case 'deadline-exceeded':
      return 'انتهت مهلة العملية. حاول مجددًا.';
    case 'resource-exhausted':
      return 'تم تجاوز الحد المسموح. حاول لاحقًا.';
    default:
      return 'حدث خطأ غير متوقع. حاول مجددًا.';
  }
}

/** Generate a short, sortable client-side id (no security guarantee — used only for non-auth collections). */
export function newId(prefix = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${t}${r}` : `${t}${r}`;
}

/** Slugify/normalize a username to the form stored in `usernames/{username}`. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}
