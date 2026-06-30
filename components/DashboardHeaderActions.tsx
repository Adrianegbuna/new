import Link from 'next/link';
import styles from '@/styles/dashboard-layout.module.css';

type DashboardHeaderActionsProps = {
  messageHref: string;
  settingsHref: string;
};

export default function DashboardHeaderActions({ messageHref, settingsHref }: DashboardHeaderActionsProps) {
  return (
    <div className={styles.headerIconRow}>
      <Link href={messageHref} className={styles.headerIconButton} aria-label="Messages">
        ✉️
        <span className={styles.headerIconDot} />
      </Link>
      <Link href={settingsHref} className={styles.headerIconButton} aria-label="Settings">
        ⚙️
      </Link>
    </div>
  );
}
