import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeActiveChallenge } from '../lib/firestore/community';

import { Button } from '../components/ui/Button';

type IconName = 'discord' | 'instagram' | 'youtube';

interface PlatformLink {
  key: 'discord' | 'instagram' | 'youtube';
  title: string;
  desc: string;
  url: string;
  accent: string;
  icon: IconName;
  handle: string;
}

const LINKS: PlatformLink[] = [
  {
    key: 'discord',
    title: 'Discord',
    desc: 'انضم إلى مجتمع YassineTia للتطوير الذاتي والتحديات والفعاليات والنقاشات اليومية.',
    url: 'https://discord.gg/zcU37Xpmk',
    accent: '#5865F2',
    icon: 'discord',
    handle: 'discord.gg/zcU37Xpmk'
  },
  {
    key: 'instagram',
    title: 'Instagram المطور',
    desc: 'تابع المطور للاطلاع على آخر التطورات والتحديثات الخاصة بالمشروع.',
    url: 'https://www.instagram.com/ily_asse_sw/',
    accent: '#E1306C',
    icon: 'instagram',
    handle: '@ily_asse_sw'
  },
  {
    key: 'youtube',
    title: 'قناة YouTube',
    desc: 'شروحات وتحديثات ومحتوى متعلق بالمجتمع ومنصة YassineTia.',
    url: 'https://www.youtube.com/@YassinTia',
    accent: '#FF0033',
    icon: 'youtube',
    handle: '@YassinTia'
  }
];

/* Per-platform monochrome glyph (Lucide-style, recolored inline). */
function PlatformGlyph({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'discord':
      return (
        <svg {...common}>
          <path d="M9 11h.01M15 11h.01" />
          <path d="M7.5 16.5c2 1 7 1 9 0" />
          <path d="M5 7.5C6.5 6.5 8 6 9.5 6h5c1.5 0 3 .5 4.5 1.5l1 1c1 1.5 1.5 5 1.5 7 0 1.5-.5 3-1 4l-1 1c-1.5 1-3 1.5-4.5 1.5h-5c-1.5 0-3-.5-4.5-1.5l-1-1c-.5-1-1-2.5-1-4 0-2 .5-5.5 1.5-7z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="3" />
          <path d="m10 9 5 3-5 3z" fill="currentColor" />
        </svg>
      );
  }
}

export function LinksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  // Show the challenge row only when we actually have a value to avoid
  // flashing an empty state on first render.
  const [challengeLoaded, setChallengeLoaded] = useState(false);

  useEffect(() => {
    // Subscribe to the active challenge. If rules deny or the doc
    // doesn't exist, we simply don't show the row. We never toast
    // a permission error here because a non-admin visitor can land
    // on this page — showing a permission toast on every visit is noise.
    const off = subscribeActiveChallenge(
      (c) => {
        setChallengeTitle(c?.title ?? null);
        setChallengeLoaded(true);
      },
      () => {
        // Silently ignore errors here — the rest of the page is
        // functional without the challenge row.
        setChallengeLoaded(true);
      }
    );
    return () => off();
  }, []);

  return (
    <div className="container yh-section" style={{ paddingTop: 56 }}>
      <div className="yh-section-head yh-fade-up">
        <span className="yh-section-eyebrow"><span className="dot" />روابط المجتمع</span>
        <h1 className="yh-section-title">الروابط <em>الرسمية</em></h1>
        <p className="yh-section-sub">
          {challengeTitle
            ? `تحدي الأسبوع النشط: ${challengeTitle} — انضم إلينا على المنصات التالية.`
            : 'روابط المنصات الرسمية لمجتمع YassineTia.'}
        </p>
      </div>

      {challengeLoaded && challengeTitle && (
        <div className="yh-card yh-card--glow yh-fade-up" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="yh-hero-preview__icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 4H4v2a4 4 0 0 0 3 4M17 4h3v2a4 4 0 0 1-3 4" /><path d="M9 14h6M10 17h4M9 20h6" /></svg>
            </span>
            <div>
              <div className="yh-card__title" style={{ marginBottom: 2 }}>تحدي الأسبوع</div>
              <div className="yh-card__desc">{challengeTitle}</div>
            </div>
          </div>
        </div>
      )}

      <div className="yh-links-grid yh-stagger">
        {LINKS.map((l) => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="yh-link-card"
            aria-label={`${l.title} — ${l.handle}`}
          >
            <span
              className="yh-link-card__icon"
              style={{
                background: `linear-gradient(135deg, ${l.accent}33, ${l.accent}10)`,
                borderColor: `${l.accent}55`,
                color: l.accent
              }}
            >
              <PlatformGlyph name={l.icon} />
            </span>
            <div className="yh-link-card__head">
              <div className="yh-link-card__title">{l.title}</div>
              <div className="yh-link-card__handle" dir="ltr">{l.handle}</div>
            </div>
            <p className="yh-link-card__desc">{l.desc}</p>
            <span className="yh-link-card__cta" dir="ltr">زيارة الرابط ↗</span>
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
        {user ? (
          <Button onClick={() => navigate('/home', { replace: true })}>← الصفحة الرئيسية</Button>
        ) : (
          <>
            <Button onClick={() => navigate('/', { replace: true })}>← الرئيسية</Button>
            <Button onClick={() => navigate('/signup')}>إنشاء حساب</Button>
          </>
        )}
      </div>
    </div>
  );
}
