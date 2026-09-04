import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

import {
  subscribeIdeas,
  updateIdeaStatus,
  setIdeaAdminReply,
  deleteIdea,
  setIdeaFeatured,
  toggleReaction
} from '../lib/firestore';
import { getAdminStats, listRecentUsers, listRecentPosts, listRecentContactMessages, type AdminStats } from '../lib/firestore/adminStats';
import { toDate, mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import { IdeaStatusBadge } from '../components/idea/IdeaStatusBadge';
import { TimeAgo } from '../components/shared/TimeAgo';
import type { IdeaDoc, IdeaStatus, UserDoc, PostDoc } from '../lib/firestore/types';

const EMPTY_STATS: AdminStats = {
  totalUsers: 0, totalIdeas: 0, totalPosts: 0, totalComments: 0, totalContactMessages: 0
};

export function AdminPage() {
  const { user, userDoc, signOut } = useAuth();
  const [ideas, setIdeas] = useState<IdeaDoc[]>([]);
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; kind: 'delete' } | null>(null);
  const [replyOpen, setReplyOpen] = useState<{ id: string; value: string } | null>(null);

  // Real-time stats and recent activity (admin only).
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [recentUsers, setRecentUsers] = useState<UserDoc[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostDoc[]>([]);
  const [recentMessages, setRecentMessages] = useState<Array<{ id: string; name: string; email: string; subject: string; message: string; isRead: boolean; createdAt: unknown }>>([]);

  useEffect(() => {
    // Real-time ideas subscription (existing behavior).
    const unsub = subscribeIdeas(
      { status: 'all', sort: 'new', pageSize: 200 },
      (items) => setIdeas(items),
      (err) => setLoadError(mapFsError(err))
    );
    return () => unsub();
  }, []);

  // Load admin dashboard data.
  const loadAdminData = async () => {
    try {
      const [s, u, p, m] = await Promise.all([
        getAdminStats(),
        listRecentUsers(5),
        listRecentPosts(5),
        listRecentContactMessages(5)
      ]);
      setStats(s);
      setRecentUsers(u);
      setRecentPosts(p);
      setRecentMessages(m);
    } catch (err) {
      setLoadError(mapFsError(err));
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filtered = (() => {
    let list = ideas;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => (i.title + i.description + (i.authorDisplayName || '')).toLowerCase().includes(q));
    if (sort === 'old') list = [...list].reverse();
    return list;
  })();

  const onChangeStatus = async (id: string, status: IdeaStatus) => {
    if (!user) return;
    try {
      await updateIdeaStatus(id, status, user.uid, {
        username: userDoc?.username ?? null,
        displayName: userDoc?.displayName ?? null,
        avatar: userDoc?.photoURL ?? user.photoURL ?? null
      });
      pushToast('تم تحديث حالة الفكرة.', 'success');
      loadAdminData();
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  const onToggleFeatured = async (idea: IdeaDoc) => {
    if (!user) return;
    try {
      await setIdeaFeatured(idea.id, !idea.isFeatured);
      pushToast(idea.isFeatured ? 'تم إزالة التمييز.' : 'تم تمييز الفكرة.', 'success');
      loadAdminData();
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  const onSaveReply = async (id: string, value: string) => {
    if (!user) return;
    try {
      await setIdeaAdminReply(id, value.trim() || null, user.uid, {
        username: userDoc?.username ?? null,
        displayName: userDoc?.displayName ?? null,
        avatar: userDoc?.photoURL ?? user.photoURL ?? null
      });
      pushToast(value.trim() ? 'تم إرسال الرد.' : 'تم حذف الرد.', 'success');
      setReplyOpen(null);
      loadAdminData();
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  const onConfirm = async () => {
    if (!confirm) return;
    try {
      await deleteIdea(confirm.id);
      pushToast('تم حذف الفكرة.', 'success');
      loadAdminData();
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
    setConfirm(null);
  };

  const onResetReactions = async (idea: IdeaDoc) => {
    // The reactions themselves remain — only the counter is reset.
    // We model "reset" as toggling the admin's own reaction if any,
    // which is the closest client-authoritative operation without
    // server-side aggregation. Admins use the Status workflow for the
    // real reset; the per-user toggle is exposed only for testing.
    if (!user) return;
    try {
      await toggleReaction(user.uid, 'admin', 'idea', idea.id, 'upvote');
      pushToast('تم تنفيذ العملية.', 'success');
    } catch (err) {
      pushToast(mapFsError(err), 'error');
    }
  };

  const onSignOut = async () => {
    await signOut();
    window.location.hash = '#/';
  };

  // Defensive: even if the route guard were bypassed, render nothing
  // useful for non-admins. (The route is already wrapped in RequireAdmin.)
  if (!user || !userDoc || userDoc.role !== 'admin') {
    return (
      <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
        <h1>غير مصرّح</h1>
        <p className="lede">هذا الحساب لا يملك صلاحيات الوصول إلى لوحة الإدارة.</p>
        <a href="#/" className="btn btn--primary">العودة للرئيسية</a>
      </div>
    );
  }

  return (
    <div className="container page-pad admin-page">
      <header className="admin-page__header">
        <div>
          <h1>لوحة الإدارة</h1>
          <p className="card__hint">إدارة الأفكار الواردة</p>
        </div>
        <div className="admin-page__actions">
          <a href="#/" className="btn btn--ghost">الصفحة الرئيسية</a>
          <button className="btn btn--danger" onClick={onSignOut}>خروج</button>
        </div>
      </header>

      <div className="stat-row admin-page__stats">
        <div className="stat"><span className="stat__num">{stats.totalUsers}</span><span className="stat__label">مستخدمون</span></div>
        <div className="stat"><span className="stat__num">{stats.totalIdeas}</span><span className="stat__label">أفكار</span></div>
        <div className="stat"><span className="stat__num">{stats.totalPosts}</span><span className="stat__label">منشورات</span></div>
        <div className="stat"><span className="stat__num">{stats.totalComments}</span><span className="stat__label">تعليقات</span></div>
        <div className="stat"><span className="stat__num">{stats.totalContactMessages}</span><span className="stat__label">رسائل تواصل</span></div>
      </div>

      <div className="section section--tight admin-recent">
        <div className="section__head">
          <h2 className="section__title">أحدث المستخدمين</h2>
        </div>
        {recentUsers.length === 0 ? (
          <div className="card admin-page__empty">لا يوجد مستخدمون بعد.</div>
        ) : (
          <div className="admin-page__list">
            {recentUsers.map((u) => (
              <article key={u.uid} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <span className="admin-card__name">
                      {u.displayName || (u.username ? `@${u.username}` : 'عضو')}
                    </span>
                    {u.username && (
                      <span className="admin-card__date" dir="ltr" style={{ color: 'var(--text-3)' }}>
                        @{u.username}
                      </span>
                    )}
                    {u.role === 'admin' && <span className="idea-badge idea-badge--planned">إداري</span>}
                  </div>
                  <TimeAgo value={u.createdAt} className="admin-card__date" />
                </header>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">أحدث المنشورات</h2>
        </div>
        {recentPosts.length === 0 ? (
          <div className="card admin-page__empty">لا توجد منشورات بعد.</div>
        ) : (
          <div className="admin-page__list">
            {recentPosts.map((p) => (
              <article key={p.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <span className="admin-card__name" style={{ color: 'var(--text-2)' }}>{p.categoryName}</span>
                  </div>
                  <TimeAgo value={p.createdAt} className="admin-card__date" />
                </header>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
                <p className="admin-card__text">{p.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">أحدث رسائل التواصل</h2>
        </div>
        {recentMessages.length === 0 ? (
          <div className="card admin-page__empty">لا توجد رسائل بعد.</div>
        ) : (
          <div className="admin-page__list">
            {recentMessages.map((m) => (
              <article key={m.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <span className="admin-card__name">{m.name}</span>
                    <span className="admin-card__date" style={{ color: 'var(--text-3)' }}>{m.email}</span>
                  </div>
                  <TimeAgo value={m.createdAt} className="admin-card__date" />
                </header>
                <p className="admin-card__hint" style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>{m.subject}</p>
                <p className="admin-card__text">{m.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="section section--tight admin-page__section">
        <div className="admin-page__filters">
          <input
            className="input"
            placeholder="ابحث في الأفكار…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="بحث في الأفكار"
          />
          <button className={'btn ' + (sort === 'new' ? 'btn--primary' : 'btn--ghost')} onClick={() => setSort('new')}>الأحدث</button>
          <button className={'btn ' + (sort === 'old' ? 'btn--primary' : 'btn--ghost')} onClick={() => setSort('old')}>الأقدم</button>
        </div>

        {loadError && <div role="alert" className="alert" style={{ marginBottom: 16 }}>{loadError}</div>}

        <div className="admin-page__list">
          {filtered.length === 0 && !loadError && (
            <div className="card admin-page__empty">
              لا توجد أفكار {search ? 'تطابق البحث' : 'بعد'}.
            </div>
          )}
          {filtered.map((idea) => {
            const d = toDate(idea.createdAt);
            const dateStr = d ? d.toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            return (
              <article key={idea.id} className="card admin-card">
                <header className="admin-card__head">
                  <div className="admin-card__author">
                    <IdeaStatusBadge status={idea.status} />
                    <span className="admin-card__name">
                      {idea.authorDisplayName ?? <em>مجهول</em>}
                    </span>
                  </div>
                  <span className="admin-card__date">{dateStr}</span>
                </header>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{idea.title}</h3>
                <p className="admin-card__text">{idea.description}</p>

                <div className="admin-page__filters" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label className="card__hint" htmlFor={'status-' + idea.id} style={{ marginInlineEnd: 8 }}>الحالة:</label>
                  <select
                    id={'status-' + idea.id}
                    className="input"
                    style={{ flex: '0 0 200px', minWidth: 0, height: 36 }}
                    value={idea.status}
                    onChange={(e) => onChangeStatus(idea.id, e.target.value as IdeaStatus)}
                  >
                    <option value="new">جديدة</option>
                    <option value="under_review">قيد المراجعة</option>
                    <option value="planned">مخطّط لها</option>
                    <option value="in_show">قيد التنفيذ</option>
                    <option value="done">منجَزة</option>
                    <option value="declined">مرفوضة</option>
                  </select>
                </div>

                {idea.adminReply ? (
                  <div className="card" style={{ background: 'var(--ink-3)', marginTop: 12, padding: 16 }}>
                    <p className="card__hint" style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>الرد الرسمي</p>
                    <p style={{ color: 'var(--text)', lineHeight: 1.7 }}>{idea.adminReply}</p>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button className="btn btn--quiet" onClick={() => setReplyOpen({ id: idea.id, value: idea.adminReply ?? '' })}>تعديل</button>
                      <button className="btn btn--quiet" onClick={() => onSaveReply(idea.id, '')}>حذف</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn--ghost" onClick={() => setReplyOpen({ id: idea.id, value: '' })}>إضافة ردّ رسمي</button>
                  </div>
                )}

                <footer className="admin-card__foot">
                  <div className="admin-card__reactions">
                    <span>👍 {idea.upvotesCount ?? 0}</span>
                    <span>💬 {idea.commentsCount ?? 0}</span>
                    {idea.isFeatured && <span style={{ color: 'var(--gold)' }}>★ مميَّزة</span>}
                  </div>
                  <div className="admin-card__actions">
                    <button className="btn btn--quiet" onClick={() => onToggleFeatured(idea)}>
                      {idea.isFeatured ? 'إلغاء التمييز' : 'تمييز'}
                    </button>
                    <button className="btn btn--quiet" onClick={() => onResetReactions(idea)}>إعادة تصويتي</button>
                    <button className="btn btn--danger" onClick={() => setConfirm({ id: idea.id, kind: 'delete' })}>حذف</button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      </div>

      {confirm && (
        <div role="dialog" aria-modal="true" className="modal">
          <div className="card modal__box">
            <h2 className="modal__title">حذف الفكرة؟</h2>
            <p className="card__hint modal__hint">لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setConfirm(null)}>إلغاء</button>
              <button className="btn btn--danger" onClick={onConfirm}>حذف</button>
            </div>
          </div>
        </div>
      )}

      {replyOpen && (
        <div role="dialog" aria-modal="true" className="modal">
          <div className="card modal__box">
            <h2 className="modal__title">الرد الرسمي</h2>
            <p className="card__hint modal__hint">سيظهر الرد للأعضاء على الفكرة.</p>
            <textarea
              className="textarea"
              value={replyOpen.value}
              onChange={(e) => setReplyOpen((r) => (r ? { ...r, value: e.target.value } : r))}
              maxLength={1000}
              placeholder="اكتب الرد…"
            />
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setReplyOpen(null)}>إلغاء</button>
              <button className="btn btn--primary" onClick={() => onSaveReply(replyOpen.id, replyOpen.value)}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
