import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUidByUsername,
  getUser,
  subscribePosts,
  subscribeIdeas,
  subscribeFollowersCount,
  subscribeFollowingCount,
  subscribeUserComments,
  type PostDoc,
  type IdeaDoc,
  type CommentDoc
} from '../lib/firestore';
import { mapFsError } from '../lib/firestore/util';
import { Avatar } from '../components/user/Avatar';
import { FollowButton } from '../components/user/FollowButton';
import { TimeAgo } from '../components/shared/TimeAgo';
import { IdeaStatusBadge } from '../components/idea/IdeaStatusBadge';
import type { UserDoc } from '../lib/firestore/types';

type LoadState = 'loading' | 'not-found' | 'error' | 'ready';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [ideas, setIdeas] = useState<IdeaDoc[]>([]);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setState('loading');
    setError(null);
    setProfile(null);
    setPosts([]);
    setIdeas([]);
    setComments([]);
    setFollowers(0);
    setFollowing(0);
    (async () => {
      try {
        const uid = await getUidByUsername(username);
        if (cancelled) return;
        if (!uid) { setState('not-found'); return; }
        const u = await getUser(uid);
        if (cancelled) return;
        if (!u) { setState('not-found'); return; }
        setProfile(u);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(mapFsError(err));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  // Subscribe to the profile's posts, ideas, and comments (real data).
  useEffect(() => {
    if (!profile) return;
    const uid = profile.uid;
    const offPosts = subscribePosts(
      { pageSize: 30 },
      (items) => setPosts(items.filter((p) => p.authorId === uid)),
      () => setPosts([])
    );
    const offIdeas = subscribeIdeas(
      { sort: 'new', pageSize: 30 },
      (items) => setIdeas(items.filter((i) => i.authorId === uid)),
      () => setIdeas([])
    );
    const offComments = subscribeUserComments(
      uid,
      (items) => setComments(items),
      () => setComments([])
    );
    return () => { offPosts(); offIdeas(); offComments(); };
  }, [profile]);

  // Followers / following live counts.
  useEffect(() => {
    if (!profile) return;
    const off1 = subscribeFollowersCount(profile.uid, setFollowers);
    const off2 = subscribeFollowingCount(profile.uid, setFollowing);
    return () => { off1(); off2(); };
  }, [profile]);

  if (state === 'loading') {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <p className="lede">جاري التحميل…</p>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <h1>المستخدم غير موجود</h1>
        <p className="lede">لا يوجد ملف شخصي بهذا الاسم.</p>
        <Link to="/" className="btn btn--primary">العودة للرئيسية</Link>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <h1>تعذّر التحميل</h1>
        <p className="lede">{error ?? 'حدث خطأ غير متوقع.'}</p>
      </div>
    );
  }

  // state === 'ready'
  const p = profile!;
  const isMe = currentUser?.uid === p.uid;
  const showAdmin = p.role === 'admin' && p.status === 'active';

  return (
    <div className="container page-pad profile-page">
      <header className="profile-cover">
        {p.coverURL ? (
          <img src={p.coverURL} alt="" className="profile-cover__img" loading="lazy" />
        ) : (
          <div className="profile-cover__placeholder" aria-hidden />
        )}
        <div className="profile-cover__row">
          <Avatar
            name={p.displayName}
            photoURL={p.photoURL}
            size={96}
            className="profile-cover__avatar"
          />
          <div className="profile-cover__main">
            <h1 className="profile-header__name">
              {p.displayName || (p.username ? `@${p.username}` : 'عضو')}
            </h1>
            {p.username && (
              <p className="profile-header__username" dir="ltr">@{p.username}</p>
            )}
            {showAdmin && (
              <span className="profile-header__badge" aria-label="حساب إداري">إداري</span>
            )}
            {p.bio && <p className="profile-header__bio">{p.bio}</p>}
          </div>
          <div className="profile-header__actions">
            {isMe ? (
              <Link to="/me" className="btn btn--ghost btn--lg">تعديل الملف</Link>
            ) : (
              <FollowButton targetUid={p.uid} />
            )}
          </div>
        </div>
      </header>

      <div className="stat-row profile-stats">
        <div className="stat"><span className="stat__num">{p.postsCount ?? 0}</span><span className="stat__label">منشورات</span></div>
        <div className="stat"><span className="stat__num">{p.ideasCount ?? 0}</span><span className="stat__label">أفكار</span></div>
        <div className="stat"><span className="stat__num">{p.commentsCount ?? 0}</span><span className="stat__label">تعليقات</span></div>
        <div className="stat"><span className="stat__num">{followers}</span><span className="stat__label">متابعون</span></div>
        <div className="stat"><span className="stat__num">{following}</span><span className="stat__label">يتابع</span></div>
        <div className="stat">
          <span className="stat__num"><TimeAgo value={p.createdAt} /></span>
          <span className="stat__label">تاريخ الانضمام</span>
        </div>
      </div>

      <div className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">الأفكار</h2>
        </div>
        {ideas.length === 0 ? (
          <div className="card admin-page__empty">لا توجد أفكار بعد.</div>
        ) : (
          <div className="admin-page__list">
            {ideas.map((i) => (
              <article key={i.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <IdeaStatusBadge status={i.status} />
                  </div>
                  <TimeAgo value={i.createdAt} className="admin-card__date" />
                </header>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{i.title}</h3>
                <p className="admin-card__text">{i.description}</p>
                <footer className="admin-card__foot">
                  <div className="admin-card__reactions">
                    <span>👍 {i.upvotesCount ?? 0}</span>
                    <span>💬 {i.commentsCount ?? 0}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">المنشورات</h2>
        </div>
        {posts.length === 0 ? (
          <div className="card admin-page__empty">لا توجد منشورات بعد.</div>
        ) : (
          <div className="admin-page__list">
            {posts.map((post) => (
              <article key={post.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    {post.isPinned && <span className="idea-badge idea-badge--planned">مثبّت</span>}
                    <span className="admin-card__name" style={{ color: 'var(--text-2)' }}>{post.categoryName}</span>
                  </div>
                  <TimeAgo value={post.createdAt} className="admin-card__date" />
                </header>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
                  <Link to={`/forum/${post.id}`} style={{ color: 'inherit' }}>{post.title}</Link>
                </h3>
                <p className="admin-card__text">{post.body}</p>
                <footer className="admin-card__foot">
                  <div className="admin-card__reactions">
                    <span>👍 {post.upvotesCount ?? 0}</span>
                    <span>💬 {post.commentsCount ?? 0}</span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">التعليقات</h2>
        </div>
        {comments.length === 0 ? (
          <div className="card admin-page__empty">لا توجد تعليقات بعد.</div>
        ) : (
          <div className="admin-page__list">
            {comments.map((c) => (
              <article key={c.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <span className="admin-card__name" style={{ color: 'var(--text-2)' }}>
                      {c.parentType === 'idea' ? 'فكرة' : 'منشور'}
                    </span>
                  </div>
                  <TimeAgo value={c.createdAt} className="admin-card__date" />
                </header>
                <p className="admin-card__text" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
