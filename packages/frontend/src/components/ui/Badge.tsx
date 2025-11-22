import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant =
  | 'default'
  | 'risk-low'
  | 'risk-moderate'
  | 'risk-high'
  | 'success'
  | 'warning'
  | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  large?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'default', large = false, className = '' }: BadgeProps) {
  const badgeClasses = [
    styles.badge,
    styles[`badge--${variant}`],
    large && styles['badge--large'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={badgeClasses}>{children}</span>;
}
