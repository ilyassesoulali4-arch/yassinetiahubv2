import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getPost,
  subscribeComments,
  createComment,
  deleteComment,
  toggleReaction,
  type PostDoc,
  type CommentDoc
} from '../lib/firestore';
import { mapFsError, toDate } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { TimeAgo } from '../components/shared/TimeAgo';
import { ProfileLink } from '../components/user/ProfileLink';
import { Button } from '../components/ui/Button';

type LoadState = 'loading' | 'not-found' | 'error' | 'ready';

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user, userDoc } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostDoc | null>(null);
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    setState('loading');
    setError(null);
    setPost(null);
    setComments([]);
    (async () => {
      try {
        const p = await getPost(postId);
        if (cancelled) return;
        if (!p) { setState('not-found'); return; }
        setPost(p);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(mapFsError(err));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  useEffect(() => {
    if (!post) return;
    const off = subscribeComments(
      'post',
      post.id,
      (items) => setComments(items),
      () => setComments([])
    );
    return () => off();
  }, [post]);

  const onReact = async () => {
    if (!post) return;
    if (!user) {
      pushToast('سجّل الدخول للتفاعل.', 'error');
      return;
    }
    setReacting(true);
    try {
      await toggleReaction(user.uid, userDoc?.username ?? user.email ?? user.uid, 'post', post.id);
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    } finally {
      setReacting(false);
    }
  };

  const onSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!post || !user || !userDoc) return;
    const text = body.trim();
    if (text.length < 1) {
      pushToast('اكتب تعليقًا.', 'error');
      return;
    }
    setPosting(true);
    try {
      await createComment({
        authorId: user.uid,
        authorUsername: userDoc.username ?? user.email ?? user.uid,
        authorDisplayName: userDoc.displayName,
        authorAvatar: userDoc.photoURL ?? user.photoURL ?? null,
        authorRole: userDoc.role === 'admin' ? 'admin' : 'user',
        body: text,
        parentType: 'post',
        parentId: post.id
      });
      setBody('');
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    } finally {
      setPosting(false);
    }
  };

  const onDeleteComment = async (c: CommentDoc) => {
    if (!post) return;
    if (!user) return;
    const canDelete = user.uid === c.authorId || userDoc?.role === 'admin';
    if (!canDelete) return;
    try {
      await deleteComment(c.id, 'post', post.id);
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

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
        <h1>المنشور غير موجود</h1>
        <p className="lede">ربما تم حذفه أو أنّ الرابط غير صحيح.</p>
        <Link to="/forum" className="btn btn--primary">العودة إلى المنتدى</Link>
      </div>
    );
  }
  if (state === 'error' || !post) {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <h1>تعذّر التحميل</h1>
        <p className="lede">{error ?? 'حدث خطأ غير متوقع.'}</p>
      </div>
    );
  }

  const canEdit = user?.uid === post.authorId;
  const isAdminUser = userDoc?.role === 'admin';

  return (
    <div className="container page-pad">
      <p style={{ marginBottom: 12 }}>
        <Link to="/forum" className="btn btn--quiet">← المنتدى</Link>
      </p>

      <article className="card admin-card">
        <header className="admin-card__head">
          <ProfileLink
            username={post.authorUsername}
            displayName={post.authorDisplayName}
            avatar={post.authorAvatar}
            size={32}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="idea-badge" aria-label="التصنيف">{post.categoryName}</span>
            {post.isPinned && <span className="idea-badge idea-badge--planned">مثبّت</span>}
            {post.isLocked && <span className="idea-badge idea-badge--declined">مغلق</span>}
            <TimeAgo value={post.createdAt} className="admin-card__date" />
          </div>
        </header>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>{post.title}</h1>
        <p className="admin-card__text" style={{ whiteSpace: 'pre-wrap' }}>{post.body}</p>
        <footer className="admin-card__foot">
          <div className="admin-card__reactions">
            <span>👍 {post.upvotesCount ?? 0}</span>
            <span>💬 {post.commentsCount ?? 0}</span>
          </div>
          <div className="admin-card__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onReact}
              disabled={reacting || !user}
              title={!user ? 'سجّل الدخول' : 'إعجاب'}
            >
              👍 إعجاب
            </button>
            {(canEdit || isAdminUser) && (
              <button type="button" className="btn btn--quiet" disabled>
                {canEdit ? 'تعديل' : 'إجراءات الإدارة'} (متاح في صفحة المنتدى لاحقًا)
              </button>
            )}
          </div>
        </footer>
      </article>

      <section className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">التعليقات ({comments.length})</h2>
        </div>

        {user ? (
          post.isLocked ? (
            <div className="card admin-page__empty">هذا المنشور مغلق ولا يقبل تعليقات جديدة.</div>
          ) : (
            <form className="card" onSubmit={onSubmitComment} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="cmt-body">أضف تعليقًا</label>
                <textarea
                  id="cmt-body"
                  className="textarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  required
                />
                <div className="field__counter" aria-live="polite">{body.length} / 2000</div>
              </div>
              <Button type="submit" disabled={posting}>
                {posting ? 'جاري النشر…' : 'نشر التعليق'}
              </Button>
            </form>
          )
        ) : (
          <div className="card admin-page__empty">
            <Link to="/login" className="login-page__link">سجّل الدخول</Link> لإضافة تعليق.
          </div>
        )}

        <div className="admin-page__list" style={{ marginTop: 16 }}>
          {comments.length === 0 && (
            <div className="card admin-page__empty">لا توجد تعليقات بعد.</div>
          )}
          {comments.map((c) => {
            const mine = user?.uid === c.authorId;
            const canDelete = mine || isAdminUser;
            const d = toDate(c.createdAt);
            return (
              <article key={c.id} className="card admin-card">
                <header className="admin-card__head">
                  <ProfileLink
                    username={c.authorUsername}
                    displayName={c.authorDisplayName}
                    avatar={c.authorAvatar}
                    size={28}
                  />
                  {c.authorRole === 'admin' && (
                    <span className="idea-badge idea-badge--planned">إداري</span>
                  )}
                  <TimeAgo value={c.createdAt} className="admin-card__date" />
                </header>
                <p className="admin-card__text" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
                {canDelete && (
                  <footer className="admin-card__foot">
                    <div />
                    <div className="admin-card__actions">
                      <button
                        type="button"
                        className="btn btn--quiet"
                        onClick={() => onDeleteComment(c)}
                      >
                        حذف
                      </button>
                    </div>
                  </footer>
                )}
                {void d}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
