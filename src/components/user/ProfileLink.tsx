import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';

interface ProfileLinkProps {
  username: string | null | undefined;
  displayName: string | null | undefined;
  avatar?: string | null;
  size?: number;
  showUsername?: boolean;
  className?: string;
}

/**
 * Clickable author byline. Only renders as a link when there is a username;
 * otherwise it falls back to a static "name + avatar" block.
 */
export function ProfileLink({ username, displayName, avatar, size = 28, showUsername = true, className }: ProfileLinkProps) {
  const name = displayName?.trim() || (username ? `@${username}` : 'عضو');
  const inner = (
    <span
      className={className ?? 'profile-link'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}
    >
      <Avatar name={name} photoURL={avatar} size={size} />
      <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
        <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </span>
        {showUsername && username && (
          <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', direction: 'ltr' }}>
            @{username}
          </span>
        )}
      </span>
    </span>
  );
  if (username) {
    return (
      <Link
        to={`/profile/${encodeURIComponent(username)}`}
        style={{ color: 'inherit', textDecoration: 'none' }}
        aria-label={`الملف الشخصي لـ ${name}`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
