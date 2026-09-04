import { useEffect, useRef, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

let externalPush: ((msg: string, kind?: ToastKind) => void) | null = null;

export function pushToast(message: string, kind: ToastKind = 'info') {
  externalPush?.(message, kind);
}

export function ToastHost() {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    externalPush = (message, kind = 'info') => {
      if (timer.current) window.clearTimeout(timer.current);
      setCurrent({ id: Date.now(), message, kind });
      timer.current = window.setTimeout(() => setCurrent(null), 3500);
    };
    return () => {
      externalPush = null;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (!current) return null;
  const cls = ['toast', 'is-show', current.kind === 'error' ? 'is-error' : current.kind === 'success' ? 'is-success' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} role="status" aria-live="polite">
      {current.message}
    </div>
  );
}
