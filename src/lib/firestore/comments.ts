import {
  addDoc,
  deleteDoc,
  doc,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { commentsCol, ideaDoc, postDoc } from './ref';
import { emitNotification, messageForComment } from './notify';
import type { CommentDoc, ParentType } from './types';

const BODY_MIN = 1;
const BODY_MAX = 2000;

export interface CreateCommentInput {
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string | null;
  authorRole: 'user' | 'admin';
  body: string;
  parentType: ParentType;
  parentId: string;
}

export function validateCommentInput(input: CreateCommentInput): void {
  const b = input.body.trim();
  if (b.length < BODY_MIN || b.length > BODY_MAX) {
    throw new Error(`التعليق يجب أن يكون بين ${BODY_MIN} و ${BODY_MAX} حرفًا.`);
  }
}

/** Create a comment. The parent's `commentsCount` is updated by a transaction. */
export async function createComment(input: CreateCommentInput): Promise<string> {
  validateCommentInput(input);
  const payload = {
    id: 'c_' + Math.random().toString(36).slice(2, 10),
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorDisplayName: input.authorDisplayName,
    authorAvatar: input.authorAvatar ?? null,
    authorRole: input.authorRole,
    body: input.body.trim(),
    parentType: input.parentType,
    parentId: input.parentId,
    isHidden: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(commentsCol, payload);
  // Bump parent counter (best-effort; rules enforce integrity on parent).
  const parentRef = input.parentType === 'post' ? postDoc(input.parentId) : ideaDoc(input.parentId);
  let parentAuthorId: string | null = null;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(parentRef);
      if (!snap.exists()) return;
      const current = (snap.get('commentsCount') as number | undefined) ?? 0;
      const authorId = (snap.get('authorId') as string | null | undefined) ?? null;
      parentAuthorId = authorId;
      tx.update(parentRef, {
        commentsCount: current + 1,
        lastActivityAt: serverTimestamp()
      });
    });
  } catch {
    // If the counter update fails (rules or offline), the comment still exists.
  }
  // Best-effort: notify the parent's author (if not the commenter).
  if (parentAuthorId && parentAuthorId !== input.authorId) {
    const display = input.authorDisplayName?.trim() || input.authorUsername || 'عضو';
    await emitNotification({
      recipientId: parentAuthorId,
      actorId: input.authorId,
      actorUsername: input.authorUsername ?? null,
      actorDisplayName: display,
      actorAvatar: input.authorAvatar ?? null,
      kind: input.parentType === 'idea' ? 'comment_on_idea' : 'comment_on_post',
      targetType: input.parentType,
      targetId: input.parentId,
      message: messageForComment(display, input.parentType)
    });
  }
  return ref.id;
}

export function subscribeComments(
  parentType: ParentType,
  parentId: string,
  onNext: (comments: CommentDoc[]) => void,
  onError?: (err: unknown) => void,
  pageSize = 200
): () => void {
  const q = query(
    commentsCol,
    where('parentType', '==', parentType),
    where('parentId', '==', parentId),
    orderBy('createdAt', 'asc'),
    limitFn(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: CommentDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommentDoc, 'id'>) }));
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

/**
 * Subscribe to all comments authored by a given user. Used by the
 * activity section on the public profile page. Requires the
 * `authorId` + `createdAt` composite index in `firestore.indexes.json`.
 */
export function subscribeUserComments(
  authorId: string,
  onNext: (comments: CommentDoc[]) => void,
  onError?: (err: unknown) => void,
  pageSize = 30
): () => void {
  if (!authorId) {
    onNext([]);
    return () => {};
  }
  const q = query(
    commentsCol,
    where('authorId', '==', authorId),
    orderBy('createdAt', 'desc'),
    limitFn(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: CommentDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommentDoc, 'id'>) }));
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

export async function deleteComment(id: string, parentType: ParentType, parentId: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', id));
  // Decrement parent counter (best-effort).
  const parentRef = parentType === 'post' ? postDoc(parentId) : ideaDoc(parentId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(parentRef);
      if (!snap.exists()) return;
      const current = (snap.get('commentsCount') as number | undefined) ?? 0;
      tx.update(parentRef, {
        commentsCount: Math.max(0, current - 1),
        lastActivityAt: serverTimestamp()
      });
    });
  } catch {
    // ignore
  }
}
