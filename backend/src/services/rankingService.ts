import { Product } from '../models/Product';

/**
 * Ranking Service
 * Calculates dynamic ranking scores for products in the feed
 * Formula: 35% popularity + 25% freshness + 15% inventory + 15% fairness + 10% randomness + bonus
 */

export class RankingService {
  /**
   * Calculate overall ranking score for a product
   * @param product Product entity
   * @param daysSince Days since product was created
   * @param sessionSeed Seeded random for consistency within session
   * @param storeVisibilityMultiplier Fairness multiplier from fairnessService (0.7-1.2)
   * @returns Ranking score 0-100
   */
  static calculateRankingScore(
    product: Product,
    daysSince: number,
    sessionSeed: number,
    storeVisibilityMultiplier: number = 1.0
  ): number {
    // Component 1: POPULARITY (35% weight, max 40 points)
    const popularityScore = this.calculatePopularityScore(product);

    // Component 2: FRESHNESS (25% weight, max 25 points)
    const freshnessScore = this.calculateFreshnessScore(daysSince);

    // Component 3: INVENTORY (15% weight, max 15 points)
    const inventoryScore = this.calculateInventoryScore(product.stock);

    // Component 4: FAIRNESS (15% weight, max 15 points)
    const fairnessScore = 15 * storeVisibilityMultiplier;

    // Component 5: RANDOMNESS (10% weight, max 10 points)
    const randomScore = this.calculateSeededRandomScore(product.id, sessionSeed);

    // Component 6: LOW-IMPRESSION BOOST (5-point bonus)
    let lowImpBoost = 0;
    if (product.impressions < 100) {
      lowImpBoost = 5;
    }

    // Rotation boost (adds to randomness)
    const rotationBonus = product.rotationBoost * 2; // 0-4 points

    // Calculate weighted sum
    const baseScore =
      popularityScore * 0.35 +
      freshnessScore * 0.25 +
      inventoryScore * 0.15 +
      fairnessScore * 0.15 +
      randomScore * 0.1;

    // Final score with bonuses
    const finalScore = Math.min(100, baseScore + lowImpBoost + rotationBonus);

    return Math.max(0, finalScore);
  }

  /**
   * Calculate popularity component (40 points max)
   * Based on clicks, purchases, impressions
   */
  private static calculatePopularityScore(product: Product): number {
    const impressions = Math.max(1, product.impressions); // Avoid division by zero
    const ctr = (product.clicks / impressions) * 100; // Click-through rate

    // CTR score (0-20 points)
    const ctrScore = Math.min(20, ctr);

    // Purchase score (0-15 points) - each purchase worth 5 points, max 50 total
    const purchaseScore = Math.min(15, product.purchases * 3);

    // Impression score (0-15 points) - 1000 impressions = max
    const impressionScore = Math.min(15, (impressions / 1000) * 15);

    return ctrScore + purchaseScore + impressionScore;
  }

  /**
   * Calculate freshness component (25 points max)
   * New products get massive boost
   */
  private static calculateFreshnessScore(daysSince: number): number {
    if (daysSince < 1) {
      return 25; // NEW! 🔥
    } else if (daysSince < 3) {
      return 20;
    } else if (daysSince < 7) {
      return 15;
    } else if (daysSince < 14) {
      return 10;
    } else {
      return 0;
    }
  }

  /**
   * Calculate inventory component (15 points max)
   * Out-of-stock items get 0
   */
  private static calculateInventoryScore(stock: number): number {
    if (stock > 20) {
      return 15;
    } else if (stock >= 10) {
      return 10;
    } else if (stock > 0) {
      return 5;
    } else {
      return 0; // Out of stock
    }
  }

  /**
   * Seeded random number using product ID + session seed
   * Ensures same product gets same random score within session
   * Different sessions = different random score
   */
  private static calculateSeededRandomScore(
    productId: string,
    sessionSeed: number
  ): number {
    // Combine product ID and session seed for seeded RNG
    const seed = this.simpleHash(productId + sessionSeed.toString());
    const random = this.seededRandom(seed);
    return random * 10; // 0-10 points
  }

  /**
   * Simple seeded random using Mulberry32 algorithm
   */
  private static seededRandom(seed: number): number {
    seed |= 0; // Convert to 32-bit integer
    seed = (seed + 0x6d2b79f5) | 0;

    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Simple hash function for string -> number
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate days since product creation
   */
  static calculateDaysSince(createdAt: Date): number {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = now.getTime() - created.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays);
  }

  /**
   * Calculate CTR (click-through rate) as percentage
   */
  static calculateCTR(clicks: number, impressions: number): number {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
  }

  /**
   * Calculate conversion rate
   */
  static calculateConversionRate(purchases: number, clicks: number): number {
    if (clicks === 0) return 0;
    return (purchases / clicks) * 100;
  }
}
