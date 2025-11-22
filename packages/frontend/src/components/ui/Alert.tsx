import type { ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  className?: string;
}

const icons: Record<AlertVariant, string> = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export function Alert({ children, variant = 'info', title, className = '' }: AlertProps) {
  const alertClasses = [styles.alert, styles[`alert--${variant}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={alertClasses} role="alert">
      <div className={styles.alert__icon} aria-hidden="true">
        {icons[variant]}
      </div>
      <div className={styles.alert__content}>
        {title && <div className={styles.alert__title}>{title}</div>}
        <div className={styles.alert__message}>{children}</div>
      </div>
    </div>
  );
}
