import type { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { ToastHost } from '../ui/Toast';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <PublicHeader />
      <main className="app-main">{children}</main>
      <PublicFooter />
      <ToastHost />
    </div>
  );
}
