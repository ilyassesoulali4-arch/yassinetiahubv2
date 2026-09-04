import { createNotification } from './notifications';
import { mapFsError } from './util';
import type { NotificationKind, ParentType } from './types';

interface EmitInput {
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
 * Best-effort notification emitter. Never throws — a failed notification
 * must not block the underlying user action (follow, upvote, comment, etc.).
 */
export async function emitNotification(input: EmitInput): Promise<void> {
  if (!input.recipientId) return;
  if (input.actorId && input.actorId === input.recipientId) return; // never notify self
  try {
    await createNotification({
      recipientId: input.recipientId,
      actorId: input.actorId,
      actorUsername: input.actorUsername ?? null,
      actorDisplayName: input.actorDisplayName ?? null,
      actorAvatar: input.actorAvatar ?? null,
      kind: input.kind,
      targetType: input.targetType,
      targetId: input.targetId,
      message: input.message
    });
  } catch (err) {
    // Surface for debugging but do not bubble up.
    // eslint-disable-next-line no-console
    console.warn('emitNotification failed:', mapFsError(err));
  }
}

export function messageForFollow(actorDisplay: string): string {
  return `${actorDisplay} يتابعك الآن.`;
}

export function messageForUpvote(actorDisplay: string, targetKind: 'idea' | 'post'): string {
  const noun = targetKind === 'idea' ? 'فكرتك' : 'منشورك';
  return `${actorDisplay} أعجب بـ ${noun}.`;
}

export function messageForComment(actorDisplay: string, targetKind: 'idea' | 'post'): string {
  const noun = targetKind === 'idea' ? 'فكرتك' : 'منشورك';
  return `${actorDisplay} علّق على ${noun}.`;
}

export function messageForIdeaStatus(newStatus: string): string {
  return `تم تحديث حالة فكرتك إلى: ${newStatus}.`;
}

export function messageForAdminReply(): string {
  return 'تم إضافة ردّ رسمي على فكرتك.';
}
