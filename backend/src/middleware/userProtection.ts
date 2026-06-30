/**
 * User Data Protection Middleware
 * Ensures users can only access their own data
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Allows users to only view their own profile
 */
export const protectUserData = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req.user || {};
  const { id } = req.params;

  // Only allow accessing own data or if user is admin
  if (id !== userId && req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied.',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Hides sensitive user fields from non-admin requests
 */
export const hideSensitiveUserFields = (user: any, requesterId?: string) => {
  if (!user) return null;

  const isOwnProfile = user.id === requesterId;
  const isAdmin = false; // Determined by middleware

  // Always remove these fields
  delete user.password;
  delete user.adminLevel;
  delete user.verifiedBy;
  delete user.refreshToken;
  delete user.resetToken;
  delete user.resetTokenExpiry;

  // Remove from non-own profiles
  if (!isOwnProfile && !isAdmin) {
    delete user.email;
    delete user.phone;
  }

  return user;
};

/**
 * Blocks access to admin-only endpoints
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { role } = req.user || {};

  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied.',
      code: 'FORBIDDEN',
    });
  }

  next();
};

/**
 * Blocks access to super-admin-only endpoints
 */
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const adminLevel = req.user?.adminLevel;

  if (adminLevel !== 'SA00') {
    return res.status(403).json({
      success: false,
      message: 'Access denied.',
      code: 'FORBIDDEN',
    });
  }

  next();
};
