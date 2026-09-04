import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeIdeas, toggleReaction } from '../lib/firestore';
import { toDate, mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { IdeaStatusBadge } from '../components/idea/IdeaStatusBadge';
import { IconArrow } from '../components/ui/Icons';
import type { IdeaDoc, IdeaStatus } from '../lib/firestore/types';

type FilterKey = 'all' | IdeaStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديدة' },
  { key: 'under_review', label: 'قيد المراجعة' },
  { key: 'planned', label: 'مخطّط لها' },
  { key: 'in_show', label: 'قيد التنفيذ' },
  { key: 'done', label: 'منجَزة' }
];

export function IdeasPage() {
  const { user, userDoc } = useAuth();
  const [ideas, setIdeas] = useState<IdeaDoc[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<'trending' | 'new'>('trending');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
    const unsub = subscribeIdeas(
      { status: filter, sort, pageSize: 50 },
      (items) => {
        // Pinned ideas always float to the top regardless of sort.
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
        setIdeas(items);
      },
      (err) => setLoadError(mapFsError(err))
    );
    return () => unsub();
  }, [filter, sort]);

  const onUpvote = async (idea: IdeaDoc) => {
    if (!user) {
      pushToast('سجّل الدخول للتصويت على الأفكار.', 'error');
      return;
    }
    try {
      await toggleReaction(user.uid, userDoc?.username ?? user.email ?? user.uid, 'idea', idea.id);
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  return (
    <div className="container page-pad">
      <header style={{ marginBottom: 24 }}>
        <h1>أفكار المجتمع</h1>
        <p className="lede">تصفّح الأفكار المقدّمة، ناقش، وادعم ما يعجبك.</p>
      </header>

      <div className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="admin-page__filters" role="tablist" aria-label="تصفية حسب الحالة">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={'btn ' + (filter === f.key ? 'btn--primary' : 'btn--ghost')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="admin-page__filters" aria-label="ترتيب">
          <button
            type="button"
            className={'btn ' + (sort === 'trending' ? 'btn--primary' : 'btn--ghost')}
            onClick={() => setSort('trending')}
          >
            الأكثر دعمًا
          </button>
          <button
            type="button"
            className={'btn ' + (sort === 'new' ? 'btn--primary' : 'btn--ghost')}
            onClick={() => setSort('new')}
          >
            الأحدث
          </button>
        </div>

        {loadError && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{loadError}</div>}

        <div className="admin-page__list">
          {ideas.length === 0 && !loadError && (
            <div className="card admin-page__empty">
              لا توجد أفكار في هذا التصنيف حتى الآن.
              <div style={{ marginTop: 12 }}>
                <Link to="/" className="btn btn--ghost">
                  شارك فكرة من الصفحة الرئيسية
                  <IconArrow />
                </Link>
              </div>
            </div>
          )}
          {ideas.map((idea) => {
            const d = toDate(idea.createdAt);
            const dateStr = d ? d.toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            return (
              <article key={idea.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <IdeaStatusBadge status={idea.status} />
                    <span className="admin-card__name">
                      {idea.authorDisplayName ?? (idea.isPinned ? 'فكرة المجتمع' : 'مجهول')}
                    </span>
                  </div>
                  <span className="admin-card__date">{dateStr}</span>
                </header>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{idea.title}</h3>
                <p className="admin-card__text">{idea.description}</p>
                {idea.adminReply && (
                  <div className="card" style={{ background: 'var(--ink-3)', marginTop: 12, padding: 16 }}>
                    <p className="card__hint" style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>ردّ القائمين</p>
                    <p style={{ color: 'var(--text)', lineHeight: 1.7 }}>{idea.adminReply}</p>
                  </div>
                )}
                <footer className="admin-card__foot">
                  <div className="admin-card__reactions">
                    <span>👍 {idea.upvotesCount ?? 0}</span>
                    <span>💬 {idea.commentsCount ?? 0}</span>
                  </div>
                  <div className="admin-card__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => onUpvote(idea)}
                      disabled={!user}
                      title={!user ? 'سجّل الدخول للتصويت' : 'ادعم الفكرة'}
                    >
                      👍 ادعم
                    </button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
