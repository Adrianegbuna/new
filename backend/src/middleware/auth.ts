import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { getRequiredJwtSecret } from '../utils/jwtSecrets';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    adminLevel?: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = getRequiredJwtSecret('JWT_SECRET');

    // Verify JWT token
    const decodedToken = jwt.verify(token, jwtSecret) as any;
    
    const userId = String(decodedToken?.sub || '').trim();
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token subject' });
    }

    // Critical: always validate token subject against current DB state.
    // If user was deleted, reject immediately even if token is still unexpired.
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({
        message: 'Account no longer exists. Please login again.',
        code: 'ACCOUNT_DELETED',
      });
    }

    req.user = {
      userId: user.id,
      email: String(user.email || ''),
      role: String(user.role || 'customer'),
      adminLevel: user.adminLevel ? String(user.adminLevel) : undefined,
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Export as authenticate alias for consistency
export const authenticate = authMiddleware;

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });
    const normalizedRole = String(user?.role || '').toLowerCase();
    const normalizedAccountType = String(user?.accountType || '').toLowerCase();
    const normalizedAdminLevel = String(user?.adminLevel || '').toUpperCase();
    const isAdminLike =
      normalizedRole === 'admin' &&
      (normalizedAccountType === 'admin' || normalizedAdminLevel.startsWith('SA') || !normalizedAdminLevel);

    if (!isAdminLike) {
      return res.status(403).json({ message: 'Admin access required' });
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'Failed to verify admin access' });
  }

  next();
};
