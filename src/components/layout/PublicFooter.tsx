import { Link } from 'react-router-dom';
import { IconInstagram } from '../ui/Icons';

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__row">
        <div>© {year} YassineTia Academy</div>
        <nav className="site-footer__links" aria-label="روابط سفلية">
          <Link to="/about">حول</Link>
          <Link to="/guidelines">القواعد</Link>
          <Link to="/contact">تواصل</Link>
          <a
            href="https://www.instagram.com/ily_asse_sw/?hl=en"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconInstagram /> Instagram
          </a>
        </nav>
      </div>
    </footer>
  );
}
