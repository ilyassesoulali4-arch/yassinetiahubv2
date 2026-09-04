import { addDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { contactMessagesCol } from './ref';

const NAME_MIN = 1;
const NAME_MAX = 100;
const EMAIL_MAX = 200;
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 150;
const MSG_MIN = 10;
const MSG_MAX = 2000;
const URL_RE = /https?:\/\//i;

export interface SubmitContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** honeypot field — must be empty for a human submission. */
  website?: string;
}

export function validateContactInput(input: SubmitContactInput): void {
  if (input.website && input.website.trim().length > 0) {
    throw new Error('SPAM_DETECTED');
  }
  const name = input.name.trim();
  const email = input.email.trim();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new Error('الاسم يجب أن يكون بين 1 و 100 حرف.');
  }
  if (email.length < 5 || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('البريد الإلكتروني غير صالح.');
  }
  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    throw new Error('الموضوع يجب أن يكون بين 3 و 150 حرفًا.');
  }
  if (message.length < MSG_MIN || message.length > MSG_MAX) {
    throw new Error(`الرسالة يجب أن تكون بين ${MSG_MIN} و ${MSG_MAX} حرف.`);
  }
  if (URL_RE.test(message)) {
    throw new Error('لا يُسمح بإدراج روابط في الرسالة.');
  }
}

export async function submitContactMessage(input: SubmitContactInput): Promise<string> {
  validateContactInput(input);
  const ref = await addDoc(contactMessagesCol, {
    id: 'm_' + Math.random().toString(36).slice(2, 10),
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
    isRead: false,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function markContactMessageRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'contactMessages', id), { isRead: true });
}
