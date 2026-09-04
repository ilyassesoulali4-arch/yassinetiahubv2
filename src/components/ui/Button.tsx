import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  iconLeft,
  iconRight,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size === 'lg' ? 'btn--lg' : '',
    block ? 'btn--block' : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
