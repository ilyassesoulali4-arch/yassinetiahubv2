import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createIdea, subscribeIdeas } from '../lib/firestore';
import { toDate, mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { TimeAgo } from '../components/shared/TimeAgo';
import { IdeaStatusBadge } from '../components/idea/IdeaStatusBadge';
import type { IdeaDoc } from '../lib/firestore/types';

const MAX_IDEA = 1000;
const MAX_NAME = 60;

/**
 * Signed-in users' main app entry. Kept intentionally close to the
 * original behaviour so existing flows (submit idea + recent feed)
 * are not regressed by the Phase 11 visual refresh.
 */
export function HomeFeedPage() {
  const { user, userDoc } = useAuth();
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<IdeaDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeIdeas(
      { sort: 'new', pageSize: 5 },
      (items) => {
        items.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
        setRecent(items);
      },
      (err) => setLoadError(mapFsError(err))
    );
    return () => unsub();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = idea.trim();
    if (text.length < 5) {
      pushToast('اكتب فكرتك في 5 أحرف على الأقل.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const authorName = user
        ? (userDoc?.displayName || user.email || 'عضو')
        : (name.trim() || null);
      const authorUsername = user ? (userDoc?.username || null) : null;
      const authorId = user ? user.uid : null;
      const authorAvatar = user?.photoURL ?? null;
      await createIdea({
        authorId,
        authorUsername,
        authorDisplayName: authorName,
        authorAvatar,
        title: text.split('\n')[0].slice(0, 100),
        description: text
      });
      setIdea('');
      setName('');
      pushToast('تم استلام فكرتك — ستظهر في قائمة الأفكار قريبًا.', 'success');
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="yh-hero yh-fade-up" style={{ paddingTop: 64, paddingBottom: 32 }}>
        <div className="container">
          <div className="yh-section-head">
            <span className="yh-section-eyebrow"><span className="dot" />مساحة الأعضاء</span>
            <h1 className="yh-section-title">مرحبًا بعودتك، <em>{userDoc?.displayName ?? 'عضو'}</em></h1>
            <p className="yh-section-sub">شارك فكرة جديدة أو تصفّح أفكار المجتمع.</p>
          </div>
        </div>
      </section>

      <section className="yh-section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="yh-card yh-card--glow" id="submit-idea">
            <h2 className="yh-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="yh-rule__check" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v3M12 19v3M5 12H2M22 12h-3" />
                </svg>
              </span>
              شارك فكرتك
            </h2>
            <p className="yh-card__desc" style={{ marginBottom: 14 }}>
              {user
                ? 'سنتشر فكرتك باسم حسابك.'
                : 'اكتب فكرتك بوضوح. الاسم اختياري.'}
            </p>
            <form onSubmit={onSubmit} noValidate>
              {!user && (
                <div style={{ marginBottom: 12 }}>
                  <input
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
                    maxLength={MAX_NAME}
                    placeholder="اسمك أو اسم مستعار"
                    autoComplete="off"
                    aria-label="الاسم"
                  />
                </div>
              )}
              <textarea
                className="textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value.slice(0, MAX_IDEA))}
                maxLength={MAX_IDEA}
                placeholder="ما الذي تودّ أن نغطّيه في المحتوى القادم؟"
                required
                aria-required="true"
                aria-label="الفكرة"
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="card__hint" style={{ fontSize: '0.78rem' }}>{idea.length} / {MAX_IDEA}</span>
                <button type="submit" className="yh-btn yh-btn--gold" disabled={submitting}>
                  {submitting ? 'جاري الإرسال…' : 'إرسال الفكرة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="yh-section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="yh-section-head">
            <h2 className="yh-section-title">آخر <em>الأفكار</em></h2>
            <Link to="/ideas" className="yh-section-sub" style={{ textDecoration: 'none' }}>عرض الكل ←</Link>
          </div>
          {loadError && (
            <div className="alert" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.3)', color: '#ffb3bb', padding: 12, borderRadius: 12, marginBottom: 12 }}>
              {loadError}
            </div>
          )}
          {recent.length === 0 && !loadError ? (
            <div className="yh-empty">لا توجد أفكار حتى الآن. كن أول من يشارك.</div>
          ) : (
            <div className="yh-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recent.map((i) => {
                const d = toDate(i.createdAt);
                const dateStr = d ? d.toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                return (
                  <article key={i.id} className="yh-card">
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IdeaStatusBadge status={i.status} />
                        <span className="yh-card__hint">{i.authorDisplayName ?? 'مجهول'}</span>
                      </div>
                      <TimeAgo value={i.createdAt} className="yh-card__hint" />
                    </header>
                    <h3 className="yh-card__title" style={{ marginBottom: 6 }}>{i.title}</h3>
                    <p className="yh-card__desc" style={{ marginBottom: 10 }}>{i.description}</p>
                    <div className="yh-hero-preview__meta" style={{ fontSize: '0.78rem' }}>{dateStr} • 👍 {i.upvotesCount ?? 0}</div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
