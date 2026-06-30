import { useEffect, useState } from 'react';
import styles from '@/styles/dashboard.module.css';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.dashboardTitle}>Dashboard</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Total Orders</h3>
          <p className={styles.statValue}>{stats?.totalOrders || 0}</p>
        </div>
        
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Revenue</h3>
          <p className={styles.statValue}>₦{stats?.revenue || 0}</p>
        </div>
        
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Active Users</h3>
          <p className={styles.statValue}>{stats?.activeUsers || 0}</p>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Pending Orders</h3>
          <p className={styles.statValue}>{stats?.pendingOrders || 0}</p>
        </div>
      </div>

      {/* ...existing charts and content... */}
    </div>
  );
}
