import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  interactive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  children,
  title,
  subtitle,
  footer,
  interactive = false,
  compact = false,
  onClick,
  className = '',
}: CardProps) {
  const cardClasses = [
    styles.card,
    interactive && styles['card--interactive'],
    compact && styles['card--compact'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} onClick={onClick}>
      {(title || subtitle) && (
        <div className={styles.card__header}>
          {title && <h3 className={styles.card__title}>{title}</h3>}
          {subtitle && <p className={styles.card__subtitle}>{subtitle}</p>}
        </div>
      )}

      <div className={styles.card__body}>{children}</div>

      {footer && <div className={styles.card__footer}>{footer}</div>}
    </div>
  );
}
