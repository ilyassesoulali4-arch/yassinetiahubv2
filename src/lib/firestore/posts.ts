import {
  addDoc,
  deleteDoc,
  getDoc,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint
} from 'firebase/firestore';
import { postsCol, postDoc } from './ref';
import { newId } from './util';
import type { PostDoc } from './types';

const TITLE_MIN = 5;
const TITLE_MAX = 150;
const BODY_MIN = 10;
const BODY_MAX = 5000;

export interface CreatePostInput {
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar?: string | null;
  title: string;
  body: string;
  categoryId: string;
  categoryName: string;
}

export function validatePostInput(input: CreatePostInput): void {
  const t = input.title.trim();
  const b = input.body.trim();
  if (t.length < TITLE_MIN || t.length > TITLE_MAX) {
    throw new Error(`العنوان يجب أن يكون بين ${TITLE_MIN} و ${TITLE_MAX} حرفًا.`);
  }
  if (b.length < BODY_MIN || b.length > BODY_MAX) {
    throw new Error(`المحتوى يجب أن يكون بين ${BODY_MIN} و ${BODY_MAX} حرفًا.`);
  }
  if (!input.categoryId) {
    throw new Error('التصنيف مطلوب.');
  }
}

/** Create a post. The server timestamp + counters are stamped by the caller doc shape. */
export async function createPost(input: CreatePostInput): Promise<string> {
  validatePostInput(input);
  const payload = {
    id: newId('p'),
    authorId: input.authorId,
    authorUsername: input.authorUsername,
    authorDisplayName: input.authorDisplayName,
    authorAvatar: input.authorAvatar ?? null,
    title: input.title.trim(),
    body: input.body.trim(),
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    isPinned: false,
    isLocked: false,
    commentsCount: 0,
    upvotesCount: 0,
    reactionCounts: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  };
  const ref = await addDoc(postsCol, payload);
  return ref.id;
}

export async function getPost(id: string): Promise<PostDoc | null> {
  const snap = await getDoc(postDoc(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<PostDoc, 'id'>) };
}

export interface ListPostsOptions {
  categoryId?: string;
  pinnedFirst?: boolean;
  pageSize?: number;
}

/** Subscribe to a list of posts. Returns the unsubscribe function. */
export function subscribePosts(
  options: ListPostsOptions,
  onNext: (posts: PostDoc[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const constraints: QueryConstraint[] = [];
  if (options.categoryId) constraints.push(where('categoryId', '==', options.categoryId));
  constraints.push(orderBy('lastActivityAt', 'desc'));
  if (options.pageSize) constraints.push(limitFn(options.pageSize));
  const q = query(postsCol, ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const items: PostDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostDoc, 'id'>) }));
      if (options.pinnedFirst) {
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
      }
      onNext(items);
    },
    (err) => onError?.(err)
  );
}

export async function updatePostBody(id: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (trimmed.length < BODY_MIN || trimmed.length > BODY_MAX) {
    throw new Error(`المحتوى يجب أن يكون بين ${BODY_MIN} و ${BODY_MAX} حرفًا.`);
  }
  await updateDoc(postDoc(id), {
    body: trimmed,
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp()
  });
}

export async function deletePost(id: string): Promise<void> {
  await deleteDoc(postDoc(id));
}
