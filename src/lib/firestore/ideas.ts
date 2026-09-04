import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { ideaDoc, ideasCol } from './ref';
import { newId } from './util';
import { emitNotification, messageForIdeaStatus, messageForAdminReply } from './notify';
import type { IdeaDoc, IdeaStatus } from './types';

const TITLE_MIN = 5;
const TITLE_MAX = 100;
const DESC_MIN = 10;
const DESC_MAX = 1000;

export interface CreateIdeaInput {
  // Anonymous-friendly: authorId/username may be null for visitor submissions.
  authorId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatar?: string | null;
  title: string;
  description: string;
  categoryId?: string | null;
  categoryName?: string | null;
}

export function validateIdeaInput(input: CreateIdeaInput): void {
  const t = input.title.trim();
  const d = input.description.trim();
  if (t.length < TITLE_MIN || t.length > TITLE_MAX) {
    throw new Error(`العنوان يجب أن يكون بين ${TITLE_MIN} و ${TITLE_MAX} حرفًا.`);
  }
  if (d.length < DESC_MIN || d.length > DESC_MAX) {
    throw new Error(`الوصف يجب أن يكون بين ${DESC_MIN} و ${DESC_MAX} حرفًا.`);
  }
}

export async function createIdea(input: CreateIdeaInput): Promise<string> {
  validateIdeaInput(input);
  const payload = {
    id: newId('i'),
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorDisplayName: input.authorDisplayName,
    authorAvatar: input.authorAvatar ?? null,
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: input.categoryId ?? null,
    categoryName: input.categoryName ?? null,
    status: 'new' as IdeaStatus,
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: null,
    isPinned: false,
    isFeatured: false,
    adminReply: null,
    adminReplyAt: null,
    upvotesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  };
  const ref = await addDoc(ideasCol, payload);
  return ref.id;
}

export async function getIdea(id: string): Promise<IdeaDoc | null> {
  const snap = await getDoc(ideaDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<IdeaDoc, 'id'>) };
}

export interface ListIdeasOptions {
  status?: IdeaStatus | 'all';
  pageSize?: number;
  /** 'trending' = sort by upvotesCount DESC. 'new' = sort by createdAt DESC. */
  sort?: 'trending' | 'new';
}

/** Fetch ideas once (no subscription). */
export async function listIdeas(options: ListIdeasOptions = {}): Promise<IdeaDoc[]> {
  const sort = options.sort ?? 'new';
  const constraints = [];
  if (options.status && options.status !== 'all') constraints.push(where('status', '==', options.status));
  constraints.push(orderBy(sort === 'trending' ? 'upvotesCount' : 'createdAt', 'desc'));
  if (options.pageSize) constraints.push(limitFn(options.pageSize));
  const q = query(ideasCol, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IdeaDoc, 'id'>) }));
}

/** Subscribe to ideas. */
export function subscribeIdeas(
  options: ListIdeasOptions,
  onNext: (ideas: IdeaDoc[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const sort = options.sort ?? 'new';
  const constraints = [];
  if (options.status && options.status !== 'all') constraints.push(where('status', '==', options.status));
  constraints.push(orderBy(sort === 'trending' ? 'upvotesCount' : 'createdAt', 'desc'));
  if (options.pageSize) constraints.push(limitFn(options.pageSize));
  const q = query(ideasCol, ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const items: IdeaDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IdeaDoc, 'id'>) }));
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

export async function updateIdeaStatus(
  id: string,
  status: IdeaStatus,
  adminUid: string,
  adminProfile?: { username?: string | null; displayName?: string | null; avatar?: string | null }
): Promise<void> {
  await updateDoc(ideaDoc(id), {
    status,
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: adminUid,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  });
  // Best-effort: notify the idea's author.
  try {
    const snap = await getDoc(ideaDoc(id));
    if (snap.exists()) {
      const authorId = (snap.get('authorId') as string | null | undefined) ?? null;
      if (authorId && authorId !== adminUid) {
        const label = STATUS_LABELS[status] ?? status;
        await emitNotification({
          recipientId: authorId,
          actorId: adminUid,
          actorUsername: adminProfile?.username ?? null,
          actorDisplayName: adminProfile?.displayName ?? 'إداري',
          actorAvatar: adminProfile?.avatar ?? null,
          kind: 'idea_status_changed',
          targetType: 'idea',
          targetId: id,
          message: messageForIdeaStatus(label)
        });
      }
    }
  } catch {
    // ignore
  }
}

export async function setIdeaAdminReply(
  id: string,
  reply: string | null,
  adminUid: string,
  adminProfile?: { username?: string | null; displayName?: string | null; avatar?: string | null }
): Promise<void> {
  await updateDoc(ideaDoc(id), {
    adminReply: reply,
    adminReplyAt: reply ? serverTimestamp() : null,
    statusUpdatedBy: adminUid,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  });
  // Best-effort: notify the idea's author.
  try {
    if (reply && reply.trim().length > 0) {
      const snap = await getDoc(ideaDoc(id));
      if (snap.exists()) {
        const authorId = (snap.get('authorId') as string | null | undefined) ?? null;
        if (authorId && authorId !== adminUid) {
          await emitNotification({
            recipientId: authorId,
            actorId: adminUid,
            actorUsername: adminProfile?.username ?? null,
            actorDisplayName: adminProfile?.displayName ?? 'إداري',
            actorAvatar: adminProfile?.avatar ?? null,
            kind: 'admin_reply',
            targetType: 'idea',
            targetId: id,
            message: messageForAdminReply()
          });
        }
      }
    }
  } catch {
    // ignore
  }
}

const STATUS_LABELS: Record<IdeaStatus, string> = {
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  planned: 'مخطّط لها',
  in_show: 'قيد التنفيذ',
  done: 'منجَزة',
  declined: 'مرفوضة'
};

export async function setIdeaFeatured(id: string, featured: boolean): Promise<void> {
  await updateDoc(ideaDoc(id), {
    isFeatured: featured,
    updatedAt: serverTimestamp()
  });
}

export async function deleteIdea(id: string): Promise<void> {
  await deleteDoc(ideaDoc(id));
}
