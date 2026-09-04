import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribePosts, toggleReaction } from '../lib/firestore';
import { toDate, mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { IconArrow } from '../components/ui/Icons';
import type { PostDoc } from '../lib/firestore/types';

const CATEGORIES = [
  { id: 'tech',        name: 'تقني' },
  { id: 'learning',    name: 'تعلّم' },
  { id: 'ideas-meta',  name: 'أفكار عن المنصة' },
  { id: 'general',     name: 'نقاش عام' },
  { id: 'questions',   name: 'أسئلة' }
];

export function ForumPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('all');
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    const unsub = subscribePosts(
      { categoryId: category === 'all' ? undefined : category, pinnedFirst: true, pageSize: 30 },
      (items) => setPosts(items),
      (err) => setLoadError(mapFsError(err))
    );
    return () => unsub();
  }, [category]);

  const onReact = async (post: PostDoc) => {
    if (!user) {
      pushToast('سجّل الدخول للتفاعل مع المنشورات.', 'error');
      return;
    }
    try {
      await toggleReaction(user.uid, user.email ?? user.uid, 'post', post.id);
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  return (
    <div className="container page-pad">
      <header style={{ marginBottom: 24 }}>
        <h1>المنتدى</h1>
        <p className="lede">نقاشات مفتوحة بين أعضاء المجتمع.</p>
      </header>

      <div className="admin-page__filters" role="tablist" aria-label="تصفية حسب التصنيف">
        <button
          type="button"
          role="tab"
          aria-selected={category === 'all'}
          className={'btn ' + (category === 'all' ? 'btn--primary' : 'btn--ghost')}
          onClick={() => setCategory('all')}
        >
          الكل
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={'btn ' + (category === c.id ? 'btn--primary' : 'btn--ghost')}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loadError && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{loadError}</div>}

      <div className="admin-page__list">
        {posts.length === 0 && !loadError && (
          <div className="card admin-page__empty">
            لا توجد منشورات في هذا التصنيف بعد.
            <div style={{ marginTop: 12 }}>
              <Link to="/" className="btn btn--ghost">
                العودة للرئيسية
                <IconArrow />
              </Link>
            </div>
          </div>
        )}
        {posts.map((p) => {
          const d = toDate(p.createdAt);
          const dateStr = d ? d.toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
          return (
            <article key={p.id} className="card admin-card">
              <header className="admin-card__head">
                <div className="admin-card__author">
                  {p.isPinned && <span className="idea-badge idea-badge--planned" aria-label="مثبّت">مثبّت</span>}
                  <span className="admin-card__name">{p.authorDisplayName || p.authorUsername || 'عضو'}</span>
                  <span className="admin-card__date" style={{ marginInlineStart: 8 }}>{p.categoryName}</span>
                </div>
                <span className="admin-card__date">{dateStr}</span>
              </header>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{p.title}</h3>
              <p className="admin-card__text">{p.body}</p>
              <footer className="admin-card__foot">
                <div className="admin-card__reactions">
                  <span>👍 {p.upvotesCount ?? 0}</span>
                  <span>💬 {p.commentsCount ?? 0}</span>
                </div>
                <div className="admin-card__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onReact(p)}
                    disabled={!user}
                    title={!user ? 'سجّل الدخول' : 'إعجاب'}
                  >
                    👍
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
