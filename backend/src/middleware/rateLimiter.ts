import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
export const rateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyBuilder?: (req: Request) => string;
}) => {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.', keyBuilder } = options;
  const store: { [key: string]: { count: number; resetTime: number } } = {};

  return (req: Request, res: Response, next: NextFunction) => {
    // Clean up old entries every 100 requests
    if (Object.keys(store).length > 1000) {
      const now = Date.now();
      Object.keys(store).forEach(key => {
        if (store[key].resetTime < now) {
          delete store[key];
        }
      });
    }

    const identifier = keyBuilder ? keyBuilder(req) : (req.ip || req.socket.remoteAddress || 'unknown');
    const now = Date.now();

    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[identifier].count++;

    if (store[identifier].count > maxRequests) {
      return res.status(429).json({
        message,
        retryAfter: Math.ceil((store[identifier].resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Stricter rate limiter for login attempts (per IP + email)
export const loginRateLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5, // 5 attempts per 5 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyBuilder: (req) => {
    const email = String((req as any).body?.email || '').toLowerCase().trim();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return email ? `${ip}|${email}` : ip;
  },
});

// General auth limiter for non-login endpoints
export const authRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many authentication requests, please slow down.',
});

// General API rate limiter
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300, // 300 requests per minute (5 per second per IP is reasonable)
  message: 'Too many requests, please slow down.',
});
