/**
 * Centralized Firestore collection references.
 * Use these instead of hardcoding collection paths in feature code.
 */
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';

export const usersCol: CollectionReference = collection(db, 'users');
export const usernamesCol: CollectionReference = collection(db, 'usernames');
export const postsCol: CollectionReference = collection(db, 'posts');
export const ideasCol: CollectionReference = collection(db, 'ideas');
export const commentsCol: CollectionReference = collection(db, 'comments');
export const reactionsCol: CollectionReference = collection(db, 'reactions');
export const followsCol: CollectionReference = collection(db, 'follows');
export const notificationsCol: CollectionReference = collection(db, 'notifications');
export const contactMessagesCol: CollectionReference = collection(db, 'contactMessages');
export const achievementsCol: CollectionReference = collection(db, 'achievements');
export const challengesCol: CollectionReference = collection(db, 'challenges');

export const userDoc = (uid: string): DocumentReference => doc(db, 'users', uid);
export const usernameDoc = (username: string): DocumentReference => doc(db, 'usernames', username.toLowerCase());
export const postDoc = (id: string): DocumentReference => doc(db, 'posts', id);
export const ideaDoc = (id: string): DocumentReference => doc(db, 'ideas', id);
export const commentDoc = (id: string): DocumentReference => doc(db, 'comments', id);
export const reactionDoc = (id: string): DocumentReference => doc(db, 'reactions', id);
export const followDoc = (id: string): DocumentReference => doc(db, 'follows', id);
export const notificationDoc = (id: string): DocumentReference => doc(db, 'notifications', id);
export const achievementDoc = (id: string): DocumentReference => doc(db, 'achievements', id);
export const challengeDoc = (id: string): DocumentReference => doc(db, 'challenges', id);
