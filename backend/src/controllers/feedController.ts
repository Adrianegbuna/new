import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { RankingService } from '../services/rankingService';
import { FairnessService } from '../services/fairnessService';

/**
 * Feed Controller
 * Implements Temu-style infinite scroll with cursor-based pagination
 * Handles ranking, recommendations, and impression tracking
 */

export class FeedController {
  /**
   * GET /api/products/feed
   * Returns paginated products with dynamic ranking
   *
   * Query params:
   * - limit: number (default 20, max 50)
   * - cursor: string (base64 encoded {rankingScore, id})
   * - sessionSeed: number (for seeded randomness)
   * - country: string (filter by country)
   */
  static async getProductFeed(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20, cursor, sessionSeed, country } = req.query;
      const pageLimit = Math.min(parseInt(limit as string) || 20, 50);

      console.log('[FEED] Request params:', { limit, cursor: cursor ? 'set' : 'null', sessionSeed, country });

      // Parse cursor if provided
      let cursorData: { rankingScore: number; id: string } | null = null;
      if (cursor && typeof cursor === 'string') {
        try {
          const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
          cursorData = JSON.parse(decoded);
        } catch (e) {
          console.error('Invalid cursor:', e);
          cursorData = null;
        }
      }

      // Generate session seed if not provided (changes every minute)
      const seed =
        sessionSeed && typeof sessionSeed === 'string'
          ? parseInt(sessionSeed)
          : Math.floor(Date.now() / 60000); // New seed every minute

      // Build base query
      let query = AppDataSource.getRepository(Product)
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.store', 'store')
        .where('(product.approvalStatus = :approved OR product.approvalStatus = :pending)', { approved: 'approved', pending: 'pending' })
        .andWhere('store.isActive = :isActive', { isActive: true });

      console.log('[FEED] Total products in DB before filtering:', await AppDataSource.getRepository(Product).count());

      // Apply country filter if provided
      if (country && typeof country === 'string') {
        query = query.andWhere(
          '(product.country = :country OR :country = ANY(string_to_array(product.availableCountries, \',\')))',
          { country }
        );
        console.log('[FEED] Filtering by country:', country);
      }

      console.log('[FEED] Total products after approval & store filter:', await AppDataSource.getRepository(Product)
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.store', 'store')
        .where('(product.approvalStatus = :approved OR product.approvalStatus = :pending)', { approved: 'approved', pending: 'pending' })
        .andWhere('store.isActive = :isActive', { isActive: true })
        .getCount());

      // Apply cursor pagination (keyset pagination)
      // Fetch products with score < cursor.score OR (score = cursor.score AND id > cursor.id)
      if (cursorData) {
        query = query.andWhere(
          '(product.rankingScore < :cursorScore OR ' +
          '(product.rankingScore = :cursorScore AND product.id > :cursorId))',
          {
            cursorScore: cursorData.rankingScore,
            cursorId: cursorData.id,
          }
        );
      }

      // Fetch one extra to determine hasMore
      const products = await query
        .orderBy('product.rankingScore', 'DESC')
        .addOrderBy('product.id', 'ASC')
        .take(pageLimit + 1)
        .getMany();

      console.log('[FEED] Final query returned:', products.length, 'products');
      if (products.length === 0) {
        console.log('[FEED] ⚠️  NO PRODUCTS FOUND. Debugging info:');
        const totalProducts = await AppDataSource.getRepository(Product).count();
        const approvedProducts = await AppDataSource.getRepository(Product).count({ where: { approvalStatus: 'approved' } });
        const activeStores = await AppDataSource.getRepository(Product)
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.store', 'store')
          .where('store.isActive = :isActive', { isActive: true })
          .getCount();
        console.log('[FEED] Debug stats:', { totalProducts, approvedProducts, activeStores });
        const allProducts = await AppDataSource.getRepository(Product).createQueryBuilder('product').leftJoinAndSelect('product.store', 'store').take(5).getMany();
        console.log('[FEED] Sample products:', allProducts.map(p => ({ id: p.id, name: p.name, approval: p.approvalStatus, storeActive: p.store?.isActive, country: p.country })));
      }

      // Non-blocking impression tracking
      const trackImpressions = (prods: Product[]) => {
        setImmediate(() => {
          try {
            prods.forEach((p) => {
              p.impressions = (p.impressions || 0) + 1;
              AppDataSource.getRepository(Product).save(p).catch((e) => console.warn('Impression tracking error:', e));
            });
          } catch (e) {
            console.warn('Impression tracking failed:', e);
          }
        });
      };

      // Determine if there are more products
      const hasMore = products.length > pageLimit;
      const feedProducts = products.slice(0, pageLimit);

      // Calculate ranking scores for each product
      const productsWithScores = feedProducts.map((product) => {
        const daysSince = RankingService.calculateDaysSince(product.createdAt);
        // Note: fairness multiplier would normally be fetched here
        // For now, using default 1.0 (can be pre-calculated and cached)
        const score = RankingService.calculateRankingScore(
          product,
          daysSince,
          seed,
          1.0 // Default fairness multiplier (should be fetched from FairnessService)
        );

        return {
          ...product,
          rankingScore: score,
        };
      });

      // Sort by calculated scores (descending)
      productsWithScores.sort((a, b) => b.rankingScore - a.rankingScore);

      // Apply fairness filter (variety per store)
      const fairProducts = FairnessService.filterForVariety(
        productsWithScores
      );

      // Inject recommendations every 4 products
      const feedWithRecommendations = FeedController.injectRecommendations(
        fairProducts,
        4
      );

      // Encode next cursor from last product
      let nextCursor: string | null = null;
      if (fairProducts.length > 0 && hasMore) {
        const lastProduct = fairProducts[fairProducts.length - 1];
        const cursorPayload = {
          rankingScore: lastProduct.rankingScore,
          id: lastProduct.id,
        };
        nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString(
          'base64'
        );
      }

      // Track impressions asynchronously (non-blocking)
      FeedController.trackImpressions(fairProducts).catch((err) => {
        console.error('Error tracking impressions:', err);
      });

      // Response
      res.json({
        success: true,
        data: feedWithRecommendations,
        pagination: {
          nextCursor: nextCursor,
          hasMore: hasMore && fairProducts.length > 0,
          totalReturned: feedWithRecommendations.length,
        },
        meta: {
          sessionSeed: seed,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Feed API Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product feed',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/products/:id/click
   * Track when user clicks on a product from feed
   */
  static async trackProductClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await AppDataSource.getRepository(Product).findOne({ where: { id: id as string } });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      // Increment click counter
      product.clicks += 1;
      await AppDataSource.getRepository(Product).save(product);

      res.json({
        success: true,
        message: 'Click tracked',
        product: {
          id: product.id,
          clicks: product.clicks,
          ctr:
            product.impressions > 0
              ? ((product.clicks / product.impressions) * 100).toFixed(2) + '%'
              : '0%',
        },
      });
    } catch (error: any) {
      console.error('Error tracking click:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track click',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/products/:id/purchase
   * Track when user purchases product after seeing in feed
   */
  static async trackProductPurchase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await AppDataSource.getRepository(Product).findOne({ where: { id: id as string } });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      // Increment purchase counter
      product.purchases += 1;
      await AppDataSource.getRepository(Product).save(product);

      res.json({
        success: true,
        message: 'Purchase tracked',
        product: {
          id: product.id,
          purchases: product.purchases,
          conversionRate:
            product.clicks > 0
              ? ((product.purchases / product.clicks) * 100).toFixed(2) + '%'
              : '0%',
        },
      });
    } catch (error: any) {
      console.error('Error tracking purchase:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track purchase',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/feed/stats
   * Get feed statistics for admin dashboard
   */
  static async getFeedStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await AppDataSource.getRepository(Product)
        .createQueryBuilder('product')
        .select('COUNT(product.id)', 'totalProducts')
        .addSelect('AVG(product.impressions)', 'avgImpressions')
        .addSelect('AVG(product.clicks)', 'avgClicks')
        .addSelect('COUNT(DISTINCT product.storeId)', 'uniqueStores')
        .where('product.approvalStatus = :status', { status: 'approved' })
        .getRawOne();

      const ctr =
        parseInt(result?.avgImpressions || 0) > 0
          ? (
              (parseInt(result?.avgClicks || 0) /
                parseInt(result?.avgImpressions || 1)) *
              100
            ).toFixed(2)
          : '0';

      const fairnessStats = await FairnessService.getFairnessStats();

      res.json({
        success: true,
        stats: {
          totalProducts: parseInt(result?.totalProducts || 0),
          avgImpressions: Math.round(parseInt(result?.avgImpressions || 0)),
          avgClicks: Math.round(parseInt(result?.avgClicks || 0)),
          avgCTR: ctr + '%',
          uniqueStores: parseInt(result?.uniqueStores || 0),
          ...fairnessStats,
        },
      });
    } catch (error: any) {
      console.error('Error getting feed stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feed statistics',
        error: error.message,
      });
    }
  }

  /**
   * Helper: Inject recommendations every X products
   */
  private static injectRecommendations(products: any[], interval: number): any[] {
    const result: any[] = [];

    for (let i = 0; i < products.length; i++) {
      result.push(products[i]);

      // Add recommendation after every `interval` products
      if ((i + 1) % interval === 0 && i + 1 < products.length) {
        // Get top 3 products not yet shown
        const topRecommendations = products
          .slice(i + 1)
          .sort((a, b) => b.rankingScore - a.rankingScore)
          .slice(0, 3);

        if (topRecommendations.length > 0) {
          result.push({
            isRecommendation: true,
            title: 'You might also like',
            products: topRecommendations.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image: p.image,
              store: p.store?.name || 'Unknown Store',
            })),
          });
        }
      }
    }

    return result;
  }

  /**
   * Helper: Track impressions asynchronously
   */
  private static async trackImpressions(products: any[]): Promise<void> {
    // Use setImmediate to avoid blocking response
    setImmediate(async () => {
      try {
        for (const product of products) {
          // Skip recommendations
          if (product.isRecommendation) continue;

          await AppDataSource.getRepository(Product)
            .createQueryBuilder()
            .update(Product)
            .set({ impressions: () => 'impressions + 1' })
            .where('id = :id', { id: product.id })
            .execute();
        }
      } catch (error) {
        console.error('Error incrementing impressions:', error);
      }
    });
  }
}
