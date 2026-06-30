import express, { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  serviceRequestController,
  adminServiceRequestController,
  notificationController,
} from '../controllers/serviceRequestController';

const router = Router();

// ============================================
// SERVICE REQUEST ROUTES (User Routes)
// ============================================

/**
 * POST /api/service-requests
 * Create a new service request
 * Authentication: Required
 */
router.post(
  '/',
  authMiddleware,
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('serviceType').trim().notEmpty().withMessage('Service type is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
    body('role').optional().isIn(['customer', 'vendor', 'installer']).withMessage('Invalid role'),
  ],
  serviceRequestController.createServiceRequest
);

/**
 * GET /api/service-requests/my
 * Get all service requests for logged-in user
 * Authentication: Required
 */
router.get('/my', authMiddleware, serviceRequestController.getMyServiceRequests);

/**
 * GET /api/service-requests/assigned/me
 * Get all service requests assigned to logged-in installer
 * Authentication: Required
 */
router.get('/assigned/me', authMiddleware, serviceRequestController.getAssignedServiceRequests);

// ============================================
// ADMIN SERVICE REQUEST ROUTES
// ============================================

/**
 * GET /api/admin/service-requests
 * Get all service requests (with optional filters)
 * Authentication: Admin only
 */
router.get('/admin/all', authMiddleware, adminMiddleware, adminServiceRequestController.getAllServiceRequests);

/**
 * PATCH /api/admin/service-requests/:id/status
 * Update service request status
 * Authentication: Admin only
 */
router.patch(
  '/admin/:id/status',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isUUID().withMessage('Invalid service request ID'),
    body('status').isIn(['pending', 'approved', 'assigned', 'in_progress', 'completed', 'rejected']).withMessage('Invalid status'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be 500 characters or less'),
  ],
  serviceRequestController.updateServiceRequestStatus
);

/**
 * PATCH /api/admin/service-requests/:id/assign
 * Assign service request to installer
 * Authentication: Admin only
 */
router.patch(
  '/admin/:id/assign',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isUUID().withMessage('Invalid service request ID'),
    body('assignToUserId').isUUID().withMessage('Invalid user ID'),
  ],
  serviceRequestController.assignServiceRequest
);

/**
 * GET /api/service-requests/:id
 * Get service request by ID
 * Authentication: Required
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('Invalid service request ID')],
  serviceRequestController.getServiceRequestById
);

// ============================================
// NOTIFICATION ROUTES
// ============================================

/**
 * GET /api/notifications
 * Get all notifications for logged-in user
 * Query params: unreadOnly (boolean)
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch(
  '/:id/read',
  authMiddleware,
  [param('id').isUUID().withMessage('Invalid notification ID')],
  notificationController.markNotificationAsRead
);

export default router;
