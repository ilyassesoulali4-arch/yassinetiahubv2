import {
  getCountFromServer,
  getDocs,
  limit as limitFn,
  orderBy,
  query
} from 'firebase/firestore';
import { commentsCol, contactMessagesCol, ideasCol, postsCol, usersCol } from './ref';
import type { UserDoc, IdeaDoc, PostDoc } from './types';

export interface AdminStats {
  totalUsers: number;
  totalIdeas: number;
  totalPosts: number;
  totalComments: number;
  totalContactMessages: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  // `getCountFromServer` performs an aggregation read on the server without
  // downloading the entire collection.
  const [u, i, p, c, m] = await Promise.all([
    getCountFromServer(usersCol),
    getCountFromServer(ideasCol),
    getCountFromServer(postsCol),
    getCountFromServer(commentsCol),
    getCountFromServer(contactMessagesCol)
  ]);
  return {
    totalUsers: u.data().count,
    totalIdeas: i.data().count,
    totalPosts: p.data().count,
    totalComments: c.data().count,
    totalContactMessages: m.data().count
  };
}

/** Recent users. The `users` collection rules permit public reads. */
export async function listRecentUsers(pageSize = 10): Promise<UserDoc[]> {
  const q = query(usersCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<UserDoc, 'uid'>), uid: d.id }));
}

export async function listRecentIdeas(pageSize = 10): Promise<IdeaDoc[]> {
  const q = query(ideasCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IdeaDoc, 'id'>) }));
}

export async function listRecentPosts(pageSize = 10): Promise<PostDoc[]> {
  const q = query(postsCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostDoc, 'id'>) }));
}

export async function listRecentContactMessages(pageSize = 10): Promise<Array<{ id: string; name: string; email: string; subject: string; message: string; isRead: boolean; createdAt: unknown }>> {
  const q = query(contactMessagesCol, orderBy('createdAt', 'desc'), limitFn(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export type { UserDoc, IdeaDoc, PostDoc };
