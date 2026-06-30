import { Request, Response, NextFunction } from 'express';

// Extend Express Request with user data
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Admin Middleware
 * Checks if user has admin role
 * Must be used after authMiddleware
 */
export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('[ADMIN_MIDDLEWARE] Checking admin status for user:', req.user?.userId);

  if (!req.user) {
    console.log('[ADMIN_MIDDLEWARE] No user object found');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'admin') {
    console.log('[ADMIN_MIDDLEWARE] User is not admin. Role:', req.user.role);
    return res.status(403).json({ message: 'Forbidden: Only admins can access this resource' });
  }

  console.log('[ADMIN_MIDDLEWARE] Admin verified. Proceeding...');
  next();
};
