import { toDate } from '../../lib/firestore/util';

interface TimeAgoProps {
  value: unknown; // Timestamp | FieldValue | string | Date | null
  className?: string;
}

function format(d: Date): string {
  return d.toLocaleDateString('ar-MA', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Renders a short Arabic date for a Firestore timestamp-like value. */
export function TimeAgo({ value, className }: TimeAgoProps) {
  const d = toDate(value);
  if (!d) {
    return <span className={className}>—</span>;
  }
  return (
    <time dateTime={d.toISOString()} className={className} title={d.toLocaleString('ar-MA')}>
      {format(d)}
    </time>
  );
}
