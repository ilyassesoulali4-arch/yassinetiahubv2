interface AvatarProps {
  name: string | null | undefined;
  photoURL?: string | null;
  size?: number;
  className?: string;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // First visible character. For Arabic names we still want a single
  // character (not a Latin-style multi-letter initial).
  for (const ch of trimmed) {
    if (!/\s/.test(ch)) return ch;
  }
  return trimmed.charAt(0);
}

/**
 * Visual avatar. Renders the user's photoURL if available; otherwise a
 * subtle initials placeholder using existing design tokens.
 */
export function Avatar({ name, photoURL, size = 40, className }: AvatarProps) {
  const dim = { width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.4)) };
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        className={className ?? 'avatar avatar--img'}
        style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return (
    <span
      className={className ?? 'avatar avatar--initials'}
      style={{
        width: dim.width,
        height: dim.height,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--gold), var(--gold-deep))',
        color: 'var(--gold-on)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: dim.fontSize,
        flexShrink: 0
      }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
