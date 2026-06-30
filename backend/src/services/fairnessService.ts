import { getRepository, DataSource } from 'typeorm';
import { Product } from '../models/Product';

/**
 * Fairness Service
 * Prevents seller dominance and ensures variety in feed
 * Controls visibility multipliers based on store impression metrics
 */

export class FairnessService {
  /**
   * Calculate visibility multiplier for a store based on total impressions
   * Returns multiplier between 0.7 (penalized) and 1.2 (boosted)
   *
   * Low impression stores get VISIBILITY BOOST
   * High impression stores get PENALTY to prevent monopoly
   */
  static async calculateStoreVisibilityMultiplier(storeId: string): Promise<number> {
    try {
      const result = await getRepository(Product)
        .createQueryBuilder('product')
        .select('SUM(product.impressions)', 'totalImpressions')
        .where('product.storeId = :storeId', { storeId })
        .andWhere('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const totalImpressions = parseInt(result?.totalImpressions || '0', 10);

      // Visibility multiplier tiers
      if (totalImpressions < 500) {
        return 1.2; // BOOST for new/small sellers
      } else if (totalImpressions < 2000) {
        return 1.0; // Normal visibility
      } else if (totalImpressions < 5000) {
        return 0.85; // Slight penalty
      } else {
        return 0.7; // Heavy penalty for dominant sellers
      }
    } catch (error) {
      console.error('Error calculating store visibility multiplier:', error);
      return 1.0; // Default to normal visibility on error
    }
  }

  /**
   * Check if store is dominant (preventing monopoly)
   * Returns true if store has > 3 products in the visible feed
   */
  static filterForVariety(products: any[]): any[] {
    const storeCount: Record<string, number> = {};

    return products.filter((product) => {
      const storeId = product.storeId;

      if (!storeCount[storeId]) {
        storeCount[storeId] = 0;
      }

      storeCount[storeId]++;

      // Allow max 2-3 products per store per page
      return storeCount[storeId] <= 3;
    });
  }

  /**
   * Get store metrics for admin dashboard
   */
  static async getStoreMetrics(storeId: string): Promise<{
    totalProducts: number
    totalImpressions: number
    totalClicks: number
    avgCTR: number
    visibilityMultiplier: number
    isDominant: boolean
  }> {
    try {
      const result = await getRepository(Product)
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'totalProducts')
        .addSelect('SUM(product.impressions)', 'totalImpressions')
        .addSelect('SUM(product.clicks)', 'totalClicks')
        .where('product.storeId = :storeId', { storeId })
        .andWhere('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const totalProducts = parseInt(result?.totalProducts || '0', 10);
      const totalImpressions = parseInt(result?.totalImpressions || '0', 10);
      const totalClicks = parseInt(result?.totalClicks || '0', 10);
      const avgCTR =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      const visibilityMultiplier = await this.calculateStoreVisibilityMultiplier(
        storeId
      );

      return {
        totalProducts,
        totalImpressions,
        totalClicks,
        avgCTR: Math.round(avgCTR * 100) / 100,
        visibilityMultiplier,
        isDominant: totalImpressions > 5000,
      };
    } catch (error) {
      console.error('Error getting store metrics:', error);
      return {
        totalProducts: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        visibilityMultiplier: 1.0,
        isDominant: false,
      };
    }
  }

  /**
   * Get low-impression products eligible for rotation boost
   * (Used by rotationCron job)
   */
  static async getLowImpressionProducts(
    ageThresholdDays: number = 7,
    dataSource?: any
  ): Promise<Product[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - ageThresholdDays);

    try {
      const repo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
      return repo
        .createQueryBuilder('product')
        .where('product.impressions < :impressions', { impressions: 50 })
        .andWhere('product.createdAt > :threshold', { threshold })
        .andWhere('product.approvalStatus = :status', { status: 'approved' })
        .orderBy('product.impressions', 'ASC')
        .take(100) // Process max 100 products per job
        .getMany();
    } catch (error: any) {
      console.warn('[Fairness] Repository not ready for low-impression query:', error.message);
      return [];
    }
  }

  /**
   * Apply rotation boost to low-impression products
   * (Called by daily rotation cron job)
   */
  static async applyRotationBoost(dataSource?: any): Promise<number> {
    try {
      const lowImpressionProducts =
        await this.getLowImpressionProducts(7, dataSource);

      let boostedCount = 0;

      for (const product of lowImpressionProducts) {
        if (product.rotationBoost < 2) {
          product.rotationBoost += 1;
          product.lowImpressionCounter += 1;
          const repo = dataSource ? dataSource.getRepository(Product) : getRepository(Product);
          await repo.save(product);
          boostedCount++;
        }
      }

      console.log(`[Rotation] Applied boost to ${boostedCount} low-impression products`);
      return boostedCount;
    } catch (error) {
      console.error('Error applying rotation boost:', error);
      return 0;
    }
  }

  /**
   * Reset rotation boost counters (weekly cleanup)
   */
  static async resetRotationBoosts(): Promise<number> {
    try {
      const result = await getRepository(Product)
        .createQueryBuilder()
        .update(Product)
        .set({ rotationBoost: 0 })
        .where('rotationBoost > :zero', { zero: 0 })
        .execute();

      const resetCount = result.affected || 0;
      console.log(`[Rotation] Reset ${resetCount} rotation boosts`);
      return resetCount;
    } catch (error) {
      console.error('Error resetting rotation boosts:', error);
      return 0;
    }
  }

  /**
   * Get fair ranking position statistics
   */
  static async getFairnessStats(): Promise<{
    productsWithLowImpressions: number
    dominantStores: number
    avgStoreProducts: number
    feedVariety: number
  }> {
    try {
      // Low impressions
      const lowImpResult = await getRepository(Product)
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'count')
        .where('product.impressions < :threshold', { threshold: 50 })
        .andWhere('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const productsWithLowImpressions = parseInt(
        lowImpResult?.count || '0',
        10
      );

      // Dominant stores
      const dominantResult = await getRepository(Product)
        .createQueryBuilder('product')
        .select('COUNT(DISTINCT product.storeId)', 'count')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const dominantStores = parseInt(dominantResult?.count || '0', 10);

      // Average products per store
      const avgResult = await getRepository(Product)
        .createQueryBuilder('product')
        .select('AVG(COUNT(*)) OVER (PARTITION BY product.storeId)', 'avg')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const avgStoreProducts = Math.round(parseFloat(avgResult?.avg || '0'));

      return {
        productsWithLowImpressions,
        dominantStores,
        avgStoreProducts,
        feedVariety: Math.min(100, (dominantStores / Math.max(1, dominantStores)) * 100),
      };
    } catch (error) {
      console.error('Error getting fairness stats:', error);
      return {
        productsWithLowImpressions: 0,
        dominantStores: 0,
        avgStoreProducts: 0,
        feedVariety: 0,
      };
    }
  }
}
