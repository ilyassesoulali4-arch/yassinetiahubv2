import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ToastHost } from '../ui/Toast';

/**
 * Minimal shell for the entry / onboarding screens.
 * Intentionally lighter than `PublicLayout` — no community nav, no footer.
 */
export function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell entry-shell">
      <header className="entry-header">
        <div className="container entry-header__inner">
          <Link to="/" className="brand" aria-label="YassineTia Hub">
            <img src="/logo.png" alt="" className="brand__logo" width={32} height={32} />
            <span className="brand__name">
              YassineTia Hub
              <small>مجتمع</small>
            </span>
          </Link>
        </div>
      </header>
      <main className="app-main entry-main">{children}</main>
      <ToastHost />
    </div>
  );
}
