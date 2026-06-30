import { Router } from 'express';
import { FeedController } from '../controllers/feedController';

const feedRoutes = Router();

/**
 * GET /api/feed
 * Infinite scroll product feed with dynamic ranking
 * Query: limit, cursor, sessionSeed, country
 */
feedRoutes.get('/', FeedController.getProductFeed);

/**
 * POST /api/feed/:id/click
 * Track product click for analytics
 */
feedRoutes.post('/:id/click', FeedController.trackProductClick);

/**
 * POST /api/feed/:id/purchase
 * Track product purchase for analytics
 */
feedRoutes.post('/:id/purchase', FeedController.trackProductPurchase);

/**
 * GET /api/feed/stats
 * Admin stats for feed performance
 */
feedRoutes.get('/stats', FeedController.getFeedStats);

export default feedRoutes;
