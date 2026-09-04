import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdminStats } from '../lib/firestore/adminStats';
import { subscribeRecentAchievements, subscribeActiveChallenge } from '../lib/firestore/community';
import { mapFsError } from '../lib/firestore/util';
import { pushToast } from '../components/ui/Toast';
import type { AchievementDoc, ChallengeDoc } from '../lib/firestore/types';
import { TimeAgo } from '../components/shared/TimeAgo';

const STATS_FALLBACK = { totalUsers: 0, totalIdeas: 0, totalPosts: 0, totalComments: 0, totalContactMessages: 0 };

type IconName =
  | 'sparkles' | 'trophy' | 'message' | 'users' | 'life' | 'star'
  | 'thumb' | 'heart' | 'fire' | 'target' | 'clap' | 'shield';

interface Feature {
  key: string;
  title: string;
  desc: string;
  icon: IconName;
}

const FEATURES: Feature[] = [
  { key: 'challenges', title: 'التحديات', desc: 'تحديات أسبوعية لتحفيز الإنتاج والتعلم.', icon: 'trophy' },
  { key: 'events', title: 'الفعاليات', desc: 'جلسات مباشرة وفعاليات مجتمعية دورية.', icon: 'sparkles' },
  { key: 'ideas', title: 'تبادل الأفكار', desc: 'شارك أفكارك واطّلع على مقترحات الآخرين.', icon: 'message' },
  { key: 'forum', title: 'المنتدى', desc: 'نقاشات مفتوحة حول مواضيع متنوعة.', icon: 'users' },
  { key: 'support', title: 'الدعم والمساعدة', desc: 'احصل على دعم من أعضاء متطوعين.', icon: 'life' },
  { key: 'achievements', title: 'مشاركة الإنجازات', desc: 'احتفل بإنجازاتك مع المجتمع.', icon: 'star' }
];

/* Community rules (8 items) */
const RULES: string[] = [
  'احترام جميع الأعضاء.',
  'منع السب والشتم.',
  'منع العنصرية والكراهية.',
  'منع المحتوى غير اللائق.',
  'منع السبام.',
  'احترام الإدارة.',
  'الالتزام بالقوانين.',
  'احترام خصوصية الأعضاء وعدم نشر معلوماتهم دون إذن.'
];

const FAQS: { q: string; a: string }[] = [
  { q: 'كيف أنضم للمجتمع؟', a: 'اضغط على "إنشاء حساب" في الأعلى وأكمل البيانات، ثم ادخل من خلال "تسجيل الدخول".' },
  { q: 'هل التسجيل مجاني؟', a: 'نعم، التسجيل في المجتمع مجاني بالكامل.' },
  { q: 'هل أحتاج Discord؟', a: 'ينصح بالانضمام إلى سيرفر الديسكورد للتفاعل اليومي، لكنه ليس شرطًا للتسجيل في الموقع.' },
  { q: 'كيف أشارك أفكاري؟', a: 'من خلال صفحة "الأفكار" أو عبر قسم "تبادل الأفكار" في المنتدى.' },
  { q: 'كيف أتواصل مع الإدارة؟', a: 'من خلال صفحة "تواصل معنا" أو عبر رسالة مباشرة لأي إداري.' },
  { q: 'كيف أحصل على رتبة مميزة؟', a: 'الرتبة المميزة تُمنح من الإدارة للمساهمين النشطين والمتميزين.' }
];

/* Six reaction types — each with its own monochrome SVG. */
const REACTIONS: { key: 'thumb' | 'heart' | 'fire' | 'target' | 'clap' | 'star'; label: string; description: string }[] = [
  { key: 'thumb', label: 'إعجاب', description: 'موافقة بسيطة' },
  { key: 'heart', label: 'تقدير', description: 'إعجاب صادق' },
  { key: 'fire', label: 'حماس', description: 'متحمّس للفكرة' },
  { key: 'target', label: 'هدف', description: 'متوافق مع الهدف' },
  { key: 'clap', label: 'دعم', description: 'دعم وتقدير' },
  { key: 'star', label: 'إنجاز', description: 'إنجاز مميّز' }
];

const ACHIEVEMENT_LABELS: Record<AchievementDoc['category'], string> = {
  study_success: 'نجاح دراسي',
  challenge_completed: 'إكمال تحدي',
  skill_learned: 'تعلم مهارة جديدة',
  sports_achievement: 'إنجاز رياضي',
  personal_goal: 'تحقيق هدف شخصي'
};

/* ─────────────────────────────────────────────
   Inline monochrome icons (Lucide-style, 1.6 stroke).
   One set covers all the home page needs.
   ───────────────────────────────────────────── */
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };
  switch (name) {
    case 'sparkles':
      return (
        <svg {...common}><path d="M12 3v3M12 18v3M5 12H2M22 12h-3" /><path d="M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" /></svg>
      );
    case 'trophy':
      return (
        <svg {...common}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 4H4v2a4 4 0 0 0 3 4M17 4h3v2a4 4 0 0 1-3 4" /><path d="M9 14h6M10 17h4M9 20h6" /></svg>
      );
    case 'message':
      return (
        <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      );
    case 'users':
      return (
        <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      );
    case 'life':
      return (
        <svg {...common}><path d="M12 22c5-3 9-7 9-12a9 9 0 0 0-18 0c0 5 4 9 9 12z" /><circle cx="12" cy="10" r="3" /></svg>
      );
    case 'star':
      return (
        <svg {...common}><path d="m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" /></svg>
      );
    case 'thumb':
      return (
        <svg {...common}><path d="M7 10v11" /><path d="M21 11.5a2.5 2.5 0 0 0-2.5-2.5H14l1-4a2 2 0 0 0-2-2.3 2 2 0 0 0-1.7.9L7 9v1z" /></svg>
      );
    case 'heart':
      return (
        <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      );
    case 'fire':
      return (
        <svg {...common}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 2.5-1 2.5-2.5 0-1.5-1-2-2-2.5-1-1-1-2 0-3 1 1 2 2 2 2.5 0 1.5-1 3-1.5 3s-3-1.5-3-3c0-2 1-4 3-5 0 2-1 4-2.5 4-2 0-3.5-2-3.5-4 1-2 3-2 4-1 0-2-.5-3-1.5-3.5-1.5z" /></svg>
      );
    case 'target':
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></svg>
      );
    case 'clap':
      return (
        <svg {...common}><path d="M9 11.5 4 17l4 4 7-7-3-3" /><path d="m12 13 5-7 3 3-5 7" /><path d="m9 11 3-9 3 3-3 9" /></svg>
      );
    case 'shield':
      return (
        <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
      );
  }
}

export function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(STATS_FALLBACK);
  const [achievements, setAchievements] = useState<AchievementDoc[]>([]);
  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAdminStats();
        if (!cancelled) setStats(s);
      } catch (err) {
        if (!cancelled) pushToast(mapFsError(err), 'error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const off1 = subscribeRecentAchievements(
      (items) => setAchievements(items),
      () => setAchievements([])
    );
    const off2 = subscribeActiveChallenge(
      (c) => setChallenge(c),
      () => setChallenge(null)
    );
    return () => { off1(); off2(); };
  }, []);

  return (
    <>
      {/* ── HERO ── */}
      <section className="yh-hero yh-fade-up" aria-labelledby="hero-title">
        <div className="container yh-hero-grid">
          <div>
            <span className="yh-hero-eyebrow">
              <span className="dot" aria-hidden /> مجتمع YassineTia — للتطوير الذاتي
            </span>
            <h1 id="hero-title" className="yh-hero-title">
              مجتمع <em>YassineTia</em>
            </h1>
            <p className="yh-hero-sub">
              مجتمع عربي للتطوير الذاتي والتعلم والانضباط وتبادل الخبرات — انضم إلينا وكن جزءاً من القصة.
            </p>
            <div className="yh-hero-cta">
              <a
                href="https://discord.gg/zcU37Xpmk"
                target="_blank"
                rel="noopener noreferrer"
                className="yh-btn yh-btn--gold yh-btn--lg"
              >
                انضم إلى الديسكورد
              </a>
              {user ? (
                <Link to="/home" className="yh-btn yh-btn--ghost yh-btn--lg">
                  الصفحة الرئيسية
                </Link>
              ) : (
                <Link to="/signup" className="yh-btn yh-btn--ghost yh-btn--lg">
                  إنشاء حساب
                </Link>
              )}
            </div>
            <div className="yh-stats">
              <div className="yh-stat">
                <span className="yh-stat__icon"><Icon name="users" /></span>
                <span className="yh-stat__num">{stats.totalUsers}</span>
                <span className="yh-stat__label">عضو</span>
              </div>
              <div className="yh-stat">
                <span className="yh-stat__icon"><Icon name="message" /></span>
                <span className="yh-stat__num">{stats.totalIdeas}</span>
                <span className="yh-stat__label">فكرة</span>
              </div>
              <div className="yh-stat">
                <span className="yh-stat__icon"><Icon name="star" /></span>
                <span className="yh-stat__num">{stats.totalPosts}</span>
                <span className="yh-stat__label">منشور</span>
              </div>
              <div className="yh-stat">
                <span className="yh-stat__icon"><Icon name="sparkles" /></span>
                <span className="yh-stat__num">{stats.totalComments}</span>
                <span className="yh-stat__label">تعليق</span>
              </div>
            </div>
          </div>

          {/* Hero preview card */}
          <aside className="yh-hero-preview yh-fade-up" aria-label="نشاط المجتمع">
            <div className="yh-hero-preview__row">
              <span className="yh-hero-preview__icon"><Icon name="trophy" /></span>
              <div className="yh-hero-preview__text">
                <div className="yh-hero-preview__title">تحدي الأسبوع</div>
                <div className="yh-hero-preview__meta">
                  {challenge ? challenge.title : 'تابعنا لمعرفة التحدي القادم'}
                </div>
              </div>
            </div>
            <div className="yh-hero-preview__row">
              <span className="yh-hero-preview__icon"><Icon name="message" /></span>
              <div className="yh-hero-preview__text">
                <div className="yh-hero-preview__title">أفكار المجتمع</div>
                <div className="yh-hero-preview__meta">{stats.totalIdeas} فكرة نشطة</div>
              </div>
            </div>
            <div className="yh-hero-preview__row">
              <span className="yh-hero-preview__icon"><Icon name="users" /></span>
              <div className="yh-hero-preview__text">
                <div className="yh-hero-preview__title">الأعضاء</div>
                <div className="yh-hero-preview__meta">{stats.totalUsers} عضو</div>
              </div>
            </div>
            <div className="yh-hero-preview__row">
              <span className="yh-hero-preview__icon"><Icon name="star" /></span>
              <div className="yh-hero-preview__text">
                <div className="yh-hero-preview__title">إنجازات حالية</div>
                <div className="yh-hero-preview__meta">{achievements.length} إنجاز منشور</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="yh-section" aria-labelledby="about-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />عن المجتمع</span>
            <h2 id="about-title" className="yh-section-title">ما هو مجتمع <em>YassineTia؟</em></h2>
            <p className="yh-section-sub">
              مساحة عربية تركز على بناء الذات، وتبادل المعرفة، وتشجيع العادات الإيجابية.
            </p>
          </div>
          <div className="yh-rules" aria-label="محاور المجتمع">
            {['تطوير الذات', 'الدراسة', 'البرمجة', 'الانضباط', 'العادات الإيجابية', 'تبادل الخبرات', 'التحديات الأسبوعية', 'الفعاليات'].map((t) => (
              <div key={t} className="yh-rule">
                <span className="yh-rule__check" aria-hidden>
                  <Icon name="sparkles" size={14} />
                </span>
                <span className="yh-rule__text">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (3 columns) ── */}
      <section className="yh-section" aria-labelledby="features-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />المميزات</span>
            <h2 id="features-title" className="yh-section-title">مميزات <em>المجتمع</em></h2>
            <p className="yh-section-sub">كل ما تحتاجه لتنمية مهاراتك والمساهمة في المجتمع في مكان واحد.</p>
          </div>
          <div className="yh-features yh-stagger">
            {FEATURES.map((f) => (
              <article key={f.key} className="yh-feature">
                <span className="yh-feature__icon"><Icon name={f.icon} size={22} /></span>
                <h3 className="yh-feature__title">{f.title}</h3>
                <p className="yh-feature__desc">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── WEEKLY CHALLENGE ── */}
      <section className="yh-section" aria-labelledby="challenge-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />تحدي الأسبوع</span>
            <h2 id="challenge-title" className="yh-section-title">تحدي <em>الأسبوع</em></h2>
          </div>
          {challenge ? (
            <div className="yh-card yh-card--glow yh-fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="yh-hero-preview__icon" aria-hidden><Icon name="trophy" /></span>
                <span className="yh-card__title" style={{ marginBottom: 0 }}>{challenge.title}</span>
              </div>
              <p className="yh-card__desc">{challenge.description}</p>
              {challenge.reward && (
                <div className="yh-card__reward">
                  <strong>المكافأة:</strong> {challenge.reward}
                </div>
              )}
              {challenge.deadline && (
                <p style={{ marginTop: 10, color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  الموعد النهائي: {challenge.deadline}
                </p>
              )}
            </div>
          ) : (
            <div className="yh-empty">لا يوجد تحدي نشط حاليًا. تابعنا لمعرفة التحدي القادم.</div>
          )}
        </div>
      </section>

      {/* ── ACHIEVEMENTS ── */}
      <section className="yh-section" aria-labelledby="achv-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />الإنجازات</span>
            <h2 id="achv-title" className="yh-section-title">إنجازات <em>المجتمع</em></h2>
            <p className="yh-section-sub">احتفل بإنجازات الأعضاء وشارك تجربتك مع الآخرين.</p>
          </div>
          {achievements.length === 0 ? (
            <div className="yh-empty">لا توجد إنجازات بعد.</div>
          ) : (
            <div className="yh-stagger" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {achievements.map((a) => (
                <article key={a.id} className="yh-card">
                  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="yh-hero-preview__icon" style={{ width: 32, height: 32 }} aria-hidden>
                      <Icon name="star" size={16} />
                    </span>
                    <span className="yh-card__hint" style={{ fontSize: '0.8rem' }}>
                      <TimeAgo value={a.createdAt} />
                    </span>
                  </header>
                  <h3 className="yh-card__title" style={{ marginBottom: 4 }}>{a.title}</h3>
                  <p className="yh-card__hint" style={{ marginBottom: 8 }}>
                    {ACHIEVEMENT_LABELS[a.category] ?? a.category} • {a.authorDisplayName ?? a.authorUsername ?? 'عضو'}
                  </p>
                  <p className="yh-card__desc">{a.description}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── RULES (8 items, 4×2 desktop / 2×4 mobile, single shield icon) ── */}
      <section className="yh-section" aria-labelledby="rules-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />القوانين</span>
            <h2 id="rules-title" className="yh-section-title">قوانين <em>المجتمع</em></h2>
            <p className="yh-section-sub">بيئة صحية وآمنة للجميع، بمسؤولية مشتركة بين الأعضاء والإدارة.</p>
          </div>
          <ul className="yh-rules-grid yh-fade-up" aria-label="قوانين المجتمع">
            {RULES.map((r, i) => (
              <li key={i} className="yh-rule-tile">
                <span className="yh-rule-tile__icon" aria-hidden>
                  <Icon name="shield" size={20} />
                </span>
                <span className="yh-rule-tile__text">{r}</span>
              </li>
            ))}
          </ul>
          <div className="yh-warn" role="note">
            <Icon name="shield" size={16} />
            <span>مخالفة القوانين قد تؤدي إلى التحذير أو كتم العضو أو الحظر.</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="yh-section" aria-labelledby="faq-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />الأسئلة الشائعة</span>
            <h2 id="faq-title" className="yh-section-title">الأسئلة <em>الشائعة</em></h2>
            <p className="yh-section-sub">إجابات سريعة على أكثر الأسئلة شيوعًا.</p>
          </div>
          <div className="yh-faq">
            {FAQS.map((f, i) => (
              <details
                key={i}
                className="yh-faq-item"
                open={openFaq === i}
                onClick={(e) => { e.preventDefault(); setOpenFaq(openFaq === i ? null : i); }}
              >
                <summary className="yh-faq-q">{f.q}</summary>
                <p className="yh-faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── REACTIONS DEMO (6 monochrome SVG cards) ── */}
      <section className="yh-section" aria-labelledby="reactions-title">
        <div className="container">
          <div className="yh-section-head yh-fade-up">
            <span className="yh-section-eyebrow"><span className="dot" />التفاعل</span>
            <h2 id="reactions-title" className="yh-section-title">تفاعل مع <em>المجتمع</em></h2>
            <p className="yh-section-sub">ستة أنواع من التفاعل على كل منشور وفكرة.</p>
          </div>
          <div className="yh-reactions-grid yh-stagger" aria-label="أنواع التفاعل">
            {REACTIONS.map((r) => (
              <div key={r.key} className="yh-reaction-tile" aria-label={`${r.label} — ${r.description}`}>
                <span className="yh-reaction-tile__icon" aria-hidden>
                  <Icon name={r.key} size={22} />
                </span>
                <div className="yh-reaction-tile__body">
                  <div className="yh-reaction-tile__title">{r.label}</div>
                  <div className="yh-reaction-tile__desc">{r.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN CTA ── */}
      <section className="yh-section" aria-labelledby="join-title">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 id="join-title" className="yh-section-title">جاهز <em>للانضمام؟</em></h2>
          <p className="yh-section-sub" style={{ marginBottom: 22 }}>
            انضم إلى مئات الأعضاء وابدأ رحلتك معنا اليوم.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://discord.gg/zcU37Xpmk"
              target="_blank"
              rel="noopener noreferrer"
              className="yh-btn yh-btn--gold yh-btn--lg"
            >
              انضم إلى الديسكورد
            </a>
            {user ? (
              <Link to="/home" className="yh-btn yh-btn--ghost yh-btn--lg">الصفحة الرئيسية</Link>
            ) : (
              <Link to="/signup" className="yh-btn yh-btn--ghost yh-btn--lg">إنشاء حساب</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
