import type { Timestamp, FieldValue } from 'firebase/firestore';

/** User document. Public fields; counters and role are server-protected. */
export interface UserDoc {
  uid: string;
  email: string;
  username: string | null;
  displayName: string;
  photoURL: string | null;
  coverURL?: string | null;
  bio?: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  postsCount: number;
  ideasCount: number;
  commentsCount: number;
  /** Cached counters maintained transactionally by the data layer. */
  followersCount?: number;
  followingCount?: number;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
  lastSeenAt?: Timestamp | FieldValue | null;
}

export interface UsernameDoc {
  username: string;          // lowercased, = doc id
  uid: string;
  createdAt: Timestamp | FieldValue | null;
}

/** Statuses allowed by Firestore Rules. */
export type IdeaStatus = 'new' | 'under_review' | 'planned' | 'in_show' | 'done' | 'declined';

export interface PostDoc {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string | null;
  title: string;             // 5-150
  body: string;              // 10-5000
  categoryId: string;
  categoryName: string;
  isPinned: boolean;
  isLocked: boolean;
  commentsCount: number;
  /** Total reaction count (sum of all emoji types). */
  upvotesCount: number;
  /** Per-emoji reaction counts. Maintained transactionally. */
  reactionCounts?: ReactionCounts;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
  lastActivityAt: Timestamp | FieldValue | null;
}

export interface IdeaDoc {
  id: string;
  authorId: string;          // may be null for anonymous (per MVP design)
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  title: string;             // 5-100
  description: string;      // 10-1000
  categoryId: string | null;
  categoryName: string | null;
  status: IdeaStatus;
  statusUpdatedAt: Timestamp | FieldValue | null;
  statusUpdatedBy: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  adminReply: string | null;
  adminReplyAt: Timestamp | FieldValue | null;
  upvotesCount: number;
  /** Per-emoji reaction counts. Maintained transactionally. */
  reactionCounts?: ReactionCounts;
  commentsCount: number;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
  lastActivityAt: Timestamp | FieldValue | null;
}

export type ParentType = 'post' | 'idea';

export interface CommentDoc {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string | null;
  authorRole: 'user' | 'admin';
  body: string;              // 1-2000
  parentType: ParentType;
  parentId: string;
  isHidden: boolean;
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
}

/** Allowed emoji reaction types. */
export const REACTION_TYPES = ['upvote', 'heart', 'fire', 'target', 'clap'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

/** Map of reaction type -> count. */
export type ReactionCounts = Partial<Record<ReactionType, number>>;

export interface ReactionDoc {
  id: string;                // = `${userId}_${targetType}_${targetId}`
  userId: string;
  username: string;
  targetType: ParentType;
  targetId: string;
  type: ReactionType;
  createdAt: Timestamp | FieldValue | null;
}

export interface FollowDoc {
  id: string;                // = `${followerId}_${followeeId}`
  followerId: string;
  followeeId: string;
  createdAt: Timestamp | FieldValue | null;
}

export type NotificationKind =
  | 'new_follower'
  | 'upvote'
  | 'comment_on_idea'
  | 'comment_on_post'
  | 'idea_status_changed'
  | 'admin_reply';

export interface NotificationDoc {
  id: string;
  recipientId: string;       // owner of the notification stream
  actorId: string | null;    // who caused it
  actorUsername?: string | null;
  actorDisplayName?: string | null;
  actorAvatar?: string | null;
  /** Alias kept for backward compatibility — same as `kind`. */
  type?: NotificationKind;
  kind: NotificationKind;
  targetType: ParentType | 'user';
  targetId: string;
  read: boolean;
  message: string;
  createdAt: Timestamp | FieldValue | null;
}

export interface ContactMessageDoc {
  id: string;
  name: string;              // 1-100
  email: string;             // 5-200
  subject: string;           // 3-150
  message: string;           // 10-2000
  isRead: boolean;
  createdAt: Timestamp | FieldValue | null;
}

/** Categories of member achievements displayed on the homepage. */
export const ACHIEVEMENT_CATEGORIES = [
  'study_success',        // نجاح دراسي
  'challenge_completed',   // إكمال تحدي
  'skill_learned',         // تعلم مهارة جديدة
  'sports_achievement',    // إنجاز رياضي
  'personal_goal'          // تحقيق هدف شخصي
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface AchievementDoc {
  id: string;
  /** Owner of the achievement. Null for community-shared achievements. */
  authorId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorAvatar: string | null;
  category: AchievementCategory;
  title: string;             // 5-120
  description: string;      // 10-500
  createdAt: Timestamp | FieldValue | null;
}

/** A community-wide weekly challenge managed by admins. */
export interface ChallengeDoc {
  id: string;
  title: string;             // 5-120
  description: string;      // 10-1000
  /** Optional deadline (ISO string). */
  deadline?: string | null;
  /** `true` if this is the currently active challenge (only one at a time). */
  isActive: boolean;
  /** Optional reward / prize description. */
  reward?: string | null;
  createdAt: Timestamp | FieldValue | null;
  createdBy: string;
}
