import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './AppShell.module.css';

interface NavItem {
  path: string;
  label: string;
  icon?: string;
}

interface AppShellProps {
  children: ReactNode;
  navItems: NavItem[];
  userEmail?: string;
  onLogout?: () => void;
}

export function AppShell({ children, navItems, userEmail, onLogout }: AppShellProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside className={styles.appShell__sidebar}>
        <div className={styles.sidebar__header}>
          <h1 className={styles.sidebar__logo}>StepSignal</h1>
          <p className={styles.sidebar__tagline}>Medical School Analytics</p>
        </div>

        <nav className={styles.sidebar__nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.nav__item} ${isActive(item.path) ? styles['nav__item--active'] : ''}`}
            >
              {item.icon && <span className={styles.nav__icon}>{item.icon}</span>}
              <span className={styles.nav__label}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {userEmail && (
          <div className={styles.sidebar__footer}>
            <div className={styles.user__info}>
              <p className={styles.user__email}>{userEmail}</p>
            </div>
            {onLogout && (
              <button onClick={onLogout} className={styles.logout__button}>
                Logout
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className={styles.appShell__main}>
        <div className={styles.main__content}>{children}</div>
      </main>
    </div>
  );
}
