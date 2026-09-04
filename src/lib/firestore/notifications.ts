import {
  addDoc,
  doc,
  getDocs,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { notificationsCol } from './ref';
import type { NotificationDoc, NotificationKind, ParentType } from './types';

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string | null;
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  actorAvatar?: string | null;
  kind: NotificationKind;
  targetType: ParentType | 'user';
  targetId: string;
  message: string;
}

/**
 * Create a notification. The recipient's notifications stream is keyed by
 * `notifications/{recipientId}/items/{notifId}` in the architecture; the
 * flat `notifications` collection here keeps things simple and indexed.
 * Server rules still validate recipient ownership.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const ref = await addDoc(notificationsCol, {
    id: 'n_' + Math.random().toString(36).slice(2, 10),
    recipientId: input.recipientId,
    actorId: input.actorId,
    actorUsername: input.actorUsername ?? null,
    actorDisplayName: input.actorDisplayName ?? null,
    actorAvatar: input.actorAvatar ?? null,
    // `type` is an alias for `kind` (the spec lists both names).
    type: input.kind,
    kind: input.kind,
    targetType: input.targetType,
    targetId: input.targetId,
    read: false,
    message: input.message,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export function subscribeNotifications(
  recipientId: string,
  onNext: (items: NotificationDoc[]) => void,
  onError?: (err: unknown) => void,
  pageSize = 50
): () => void {
  const q = query(
    notificationsCol,
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limitFn(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: NotificationDoc[] = snap.docs.map((d) => {
        const data = d.data() as Partial<NotificationDoc> & { type?: NotificationKind; kind?: NotificationKind };
        const kind = (data.kind ?? data.type) as NotificationKind;
        return { id: d.id, ...(data as Omit<NotificationDoc, 'id' | 'kind'>), kind };
      });
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

export async function listNotifications(recipientId: string, pageSize = 50): Promise<NotificationDoc[]> {
  const q = query(
    notificationsCol,
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limitFn(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<NotificationDoc> & { type?: NotificationKind; kind?: NotificationKind };
    const kind = (data.kind ?? data.type) as NotificationKind;
    return { id: d.id, ...(data as Omit<NotificationDoc, 'id' | 'kind'>), kind };
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  const items = await listNotifications(recipientId, 200);
  if (items.length === 0) return;
  const batch = writeBatch(db);
  for (const n of items) {
    if (!n.read) batch.update(doc(db, 'notifications', n.id), { read: true });
  }
  await batch.commit();
}
