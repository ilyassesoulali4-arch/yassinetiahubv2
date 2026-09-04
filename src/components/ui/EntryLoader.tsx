export function EntryLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-2)'
      }}
    >
      <span style={{ fontSize: '0.9rem' }}>جاري التحميل…</span>
    </div>
  );
}
