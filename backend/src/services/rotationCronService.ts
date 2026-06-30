import { DataSource, getRepository } from 'typeorm';
import { Product } from '../models/Product';
import { FairnessService } from './fairnessService';

/**
 * Rotation Cron Service
 * Handles background jobs for:
 * - Recalculating ranking scores
 * - Boosting low-impression products
 * - Resetting rotation counters
 * - Feed health monitoring
 */

export class RotationCronService {
  private static dataSource: any = null;

  /**
   * Start all cron jobs
   * Call this once in server.ts during app initialization
   */
  static startCronJobs(dataSource?: any): void {
    if (dataSource) {
      this.dataSource = dataSource;
    }
    console.log('[Cron] Starting product rotation cron jobs...');

    // Run Immediately on startup (non-blocking, with error handling)
    Promise.resolve()
      .then(() => this.runHourlyRotation())
      .catch(error => console.warn('[Cron-Startup] Initial rotation failed (non-blocking):', error.message));

    // Every hour: recalculate scores and boost low-impression products
    setInterval(() => {
      this.runHourlyRotation().catch(error => 
        console.warn('[Cron-Hourly] Error:', error.message)
      );
    }, 1 * 60 * 60 * 1000); // 1 hour

    // Every 24 hours: reset rotation boosts
    setInterval(() => {
      this.runDailyRotation().catch(error => 
        console.warn('[Cron-Daily] Error:', error.message)
      );
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Every 7 days (604800000 ms): reset all counters
    setInterval(() => {
      this.runWeeklyRotation().catch(error => 
        console.warn('[Cron-Weekly] Error:', error.message)
      );
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

    console.log('[Cron] Cron jobs started successfully');
  }

  /**
   * HOURLY JOB
   * - Apply rotation boosts to stuck products
   * - Log feed health metrics
   */
  private static async runHourlyRotation(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[Cron-Hourly] Starting hourly rotation job...');

      // Ensure TypeORM is ready
      if (!this.dataSource || !this.dataSource.isInitialized) {
        console.warn('[Cron-Hourly] TypeORM not fully initialized, skipping this run');
        return;
      }

      // Apply boost to low-impression products
      const boostedCount = await FairnessService.applyRotationBoost(this.dataSource);

      // Get feed health
      const stats = await this.getFeedHealth(this.dataSource);

      console.log('[Cron-Hourly] Job complete:', {
        productsBoosted: boostedCount,
        feedHealth: stats,
        duration: Date.now() - startTime + 'ms',
      });
    } catch (error) {
      console.error('[Cron-Hourly] Error:', error);
    }
  }

  /**
   * DAILY JOB
   * - Reset rotation boost counters
   * - Analyze feed fairness
   */
  private static async runDailyRotation(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[Cron-Daily] Starting daily rotation job...');

      // Reset rotation boosts (products that were boosted will lose boost next hour)
      const resetCount = await FairnessService.resetRotationBoosts();

      // Get fairness metrics
      const fairnessStats = await FairnessService.getFairnessStats();

      console.log('[Cron-Daily] Job complete:', {
        boostsReset: resetCount,
        fairnessStats,
        duration: Date.now() - startTime + 'ms',
      });
    } catch (error) {
      console.error('[Cron-Daily] Error:', error);
    }
  }

  /**
   * WEEKLY JOB
   * - Full feed analysis
   * - Cleanup and optimization
   * - Generate report
   */
  private static async runWeeklyRotation(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[Cron-Weekly] Starting weekly rotation job...');

      // Get comprehensive feed analysis
      const analysis = await this.analyzeFullFeed(this.dataSource);

      console.log('[Cron-Weekly] Job complete:', {
        analysis,
        duration: Date.now() - startTime + 'ms',
      });
    } catch (error) {
      console.error('[Cron-Weekly] Error:', error);
    }
  }

  /**
   * Get feed health metrics
   */
  private static async getFeedHealth(dataSource?: any): Promise<{
    totalProducts: number
    approvedProducts: number
    avgImpressions: number
    avgCTR: string
    productsWithZeroImpressions: number
    newestProduct: {
      name: string
      ageHours: number
    } | null
  }> {
    try {
      // Total stats
      const repo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const statsResult = await repo
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'totalProducts')
        .addSelect('COUNT(CASE WHEN product.approvalStatus = :status THEN 1 END)', 'approvedProducts')
        .addSelect('AVG(product.impressions)', 'avgImpressions')
        .addSelect('SUM(product.clicks)', 'totalClicks')
        .addSelect('SUM(product.impressions)', 'totalImpressions')
        .setParameter('status', 'approved')
        .getRawOne();

      const totalImpressions = parseInt(statsResult?.totalImpressions || 0);
      const totalClicks = parseInt(statsResult?.totalClicks || 0);
      const avgCTR =
        totalImpressions > 0
          ? ((totalClicks / totalImpressions) * 100).toFixed(2)
          : '0.00';

      // Zero impression products
      const zeroRepo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const zeroResult = await zeroRepo
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'count')
        .where('product.impressions = :zero', { zero: 0 })
        .andWhere('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const zeroImpressions = parseInt(zeroResult?.count || 0);

      // Newest product
      const newestRepo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const newestResult = await newestRepo
        .createQueryBuilder('product')
        .select('product.name', 'name')
        .addSelect('product.createdAt', 'createdAt')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .orderBy('product.createdAt', 'DESC')
        .take(1)
        .getRawOne();

      let newestProduct: { name: string; ageHours: number } | null = null;
      if (newestResult) {
        const ageMs = Date.now() - new Date(newestResult.createdAt).getTime();
        const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
        newestProduct = {
          name: newestResult.name,
          ageHours,
        };
      }

      return {
        totalProducts: parseInt(statsResult?.totalProducts || 0),
        approvedProducts: parseInt(statsResult?.approvedProducts || 0),
        avgImpressions: Math.round(parseInt(statsResult?.avgImpressions || 0)),
        avgCTR: avgCTR + '%',
        productsWithZeroImpressions: zeroImpressions,
        newestProduct,
      };
    } catch (error) {
      console.error('Error getting feed health:', error);
      return {
        totalProducts: 0,
        approvedProducts: 0,
        avgImpressions: 0,
        avgCTR: '0.00%',
        productsWithZeroImpressions: 0,
        newestProduct: null,
      };
    }
  }

  /**
   * Analyze entire feed for fairness and performance
   */
  private static async analyzeFullFeed(dataSource?: any): Promise<{
    totalProducts: number
    feedVariety: number
    dominantStoreCount: number
    avgProductsPerStore: number
    topStores: Array<{
      storeId: string
      productCount: number
      impressions: number
      dominancePercentage: number
    }>
    performanceMetrics: {
      avgCTR: string
      conversionRate: string
      totalImpressions: number
      totalClicks: number
      totalPurchases: number
    }
  }> {
    try {
      // Total products
      const countRepo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const countResult = await countRepo
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'count')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const totalProducts = parseInt(countResult?.count || 0);

      // Store metrics
      const storeRepo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const storeMetrics = await storeRepo
        .createQueryBuilder('product')
        .select('product.storeId', 'storeId')
        .addSelect('COUNT(product.id)', 'productCount')
        .addSelect('SUM(product.impressions)', 'impressions')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .groupBy('product.storeId')
        .orderBy('COUNT(product.id)', 'DESC')
        .take(10)
        .getRawMany();

      const uniqueStores = storeMetrics.length;
      const avgProductsPerStore = Math.round(totalProducts / Math.max(1, uniqueStores));

      // Calculate dominance percentages
      const topStores = storeMetrics.map((store) => ({
        storeId: store.storeId,
        productCount: parseInt(store.productCount),
        impressions: parseInt(store.impressions || 0),
        dominancePercentage: Math.round(
          (parseInt(store.productCount) / Math.max(1, totalProducts)) * 100
        ),
      }));

      // Performance metrics
      const perfRepo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      const perfResult = await perfRepo
        .createQueryBuilder('product')
        .select('SUM(product.impressions)', 'totalImpressions')
        .addSelect('SUM(product.clicks)', 'totalClicks')
        .addSelect('SUM(product.purchases)', 'totalPurchases')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const totalImpressions = parseInt(perfResult?.totalImpressions || 0);
      const totalClicks = parseInt(perfResult?.totalClicks || 0);
      const totalPurchases = parseInt(perfResult?.totalPurchases || 0);

      const avgCTR =
        totalImpressions > 0
          ? ((totalClicks / totalImpressions) * 100).toFixed(2)
          : '0.00';

      const conversionRate =
        totalClicks > 0
          ? ((totalPurchases / totalClicks) * 100).toFixed(2)
          : '0.00';

      return {
        totalProducts,
        feedVariety: Math.round((uniqueStores / Math.max(1, uniqueStores)) * 100),
        dominantStoreCount: storeMetrics.filter(
          (s) => (parseInt(s.productCount) / totalProducts) * 100 > 10
        ).length,
        avgProductsPerStore,
        topStores,
        performanceMetrics: {
          avgCTR: avgCTR + '%',
          conversionRate: conversionRate + '%',
          totalImpressions,
          totalClicks,
          totalPurchases,
        },
      };
    } catch (error) {
      console.error('Error analyzing feed:', error);
      throw error;
    }
  }
}
