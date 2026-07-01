import { ReactNode, useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/dashboard-layout.module.css';

export type DashboardSidebarItem = {
  key: string;
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
};

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  sidebarItems: DashboardSidebarItem[];
  activeKey?: string;
  onNavigate?: (key: string) => void;
  headerRight?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
};

export default function DashboardLayout({
  title,
  subtitle,
  sidebarItems,
  activeKey,
  onNavigate,
  headerRight,
  hideHeader = false,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.dashboardRoot}>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setSidebarOpen(true)}
        aria-label="Open dashboard navigation"
      >
        Menu
      </button>

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>{title}</span>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close dashboard navigation"
          >
            Close
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {sidebarItems.map((item) => {
            const isActive = item.key === activeKey;
            const className = `${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`;

            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={className}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className={styles.sidebarIcon}>{item.icon}</span>
                  <span className={styles.sidebarLabel}>{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={className}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (onNavigate) onNavigate(item.key);
                  setSidebarOpen(false);
                }}
              >
                <span className={styles.sidebarIcon}>{item.icon}</span>
                <span className={styles.sidebarLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      <main className={styles.mainContent}>
        {!hideHeader && (
          <div className={styles.mainHeader}>
            <div>
              <h1 className={styles.mainTitle}>{title}</h1>
              {subtitle && <p className={styles.mainSubtitle}>{subtitle}</p>}
            </div>
            {headerRight && <div className={styles.mainActions}>{headerRight}</div>}
          </div>
        )}
        {hideHeader && headerRight && <div className={styles.mainHeaderCompact}>{headerRight}</div>}

        <div className={styles.mobileQuickNav} aria-label="Dashboard quick navigation">
          {sidebarItems.map((item) => {
            const isActive = item.key === activeKey;
            const className = `${styles.mobileQuickItem} ${isActive ? styles.mobileQuickItemActive : ''}`;

            if (item.href) {
              return (
                <Link key={`quick-${item.key}`} href={item.href} className={className}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={`quick-${item.key}`}
                type="button"
                className={className}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (onNavigate) onNavigate(item.key);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.contentInner}>{children}</div>
      </main>
    </div>
  );
}
