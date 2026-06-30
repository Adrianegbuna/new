import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ServiceRequestService, NotificationService as ServiceRequestNotificationService } from '../services/serviceRequestService';
import { NotificationService as AppNotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';

// Extend Express Request with user data
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// ============================================
// SERVICE REQUEST CONTROLLER
// ============================================
export const serviceRequestController = {
  /**
   * POST /api/service-requests
   * Create a new service request
   */
  createServiceRequest: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Creating service request');

    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[SERVICE_REQUEST_CONTROLLER] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, phone, serviceType, message, role } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        console.log('[SERVICE_REQUEST_CONTROLLER] No user ID in request');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Create service request
      const paidFlag = String(message || '').toLowerCase().includes('payment reference');
      const serviceRequest = await ServiceRequestService.createServiceRequest(
        userId,
        fullName,
        email,
        phone,
        serviceType,
        message,
        role || 'customer',
        paidFlag
      );

      console.log('[SERVICE_REQUEST_CONTROLLER] Service request created:', serviceRequest.id);

      try {
        await AppNotificationService.createNotification(
          userId,
          NotificationType.GENERAL,
          'Service request submitted',
          'Your service request payment was successful and your request has been submitted.',
          { relatedId: serviceRequest.id, actionUrl: '/service-requests?tab=my-requests' }
        );
      } catch (notifyError: any) {
        console.warn('[SERVICE_REQUEST_CONTROLLER] Failed to notify customer:', notifyError?.message || notifyError);
      }

      res.status(201).json({
        success: true,
        message: 'Service request created successfully',
        data: serviceRequest,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error creating service request:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create service request',
      });
    }
  },

  /**
   * GET /api/service-requests/:id
   * Get service request by ID
   */
  getServiceRequestById: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Fetching service request:', req.params.id);

    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!id) {
        return res.status(400).json({ message: 'Service request ID is required' });
      }

      const serviceRequest = await ServiceRequestService.getServiceRequestById(id);

      if (!serviceRequest) {
        return res.status(404).json({ message: 'Service request not found' });
      }

      // Check authorization: user can only view their own requests, admins can view all
      if (req.user?.role !== 'admin' && serviceRequest.userId !== userId) {
        console.log('[SERVICE_REQUEST_CONTROLLER] Unauthorized access attempt');
        return res.status(403).json({ message: 'Unauthorized' });
      }

      console.log('[SERVICE_REQUEST_CONTROLLER] Service request fetched successfully');

      res.status(200).json({
        success: true,
        data: serviceRequest,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error fetching service request:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch service request',
      });
    }
  },

  /**
   * GET /api/service-requests/my
   * Get all service requests for logged-in user
   */
  getMyServiceRequests: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Fetching user service requests');

    try {
      const userId = req.user?.userId;

      if (!userId) {
        console.log('[SERVICE_REQUEST_CONTROLLER] No user ID in request');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const serviceRequests = await ServiceRequestService.getUserServiceRequests(userId);

      console.log('[SERVICE_REQUEST_CONTROLLER] Found', serviceRequests.length, 'requests');

      res.status(200).json({
        success: true,
        count: serviceRequests.length,
        data: serviceRequests,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error fetching user requests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch service requests',
      });
    }
  },

  /**
   * GET /api/service-requests/assigned/me
   * Get all service requests assigned to logged-in installer
   */
  getAssignedServiceRequests: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Fetching assigned service requests');

    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignedRequests = await ServiceRequestService.getAssignedServiceRequests(userId);

      res.status(200).json({
        success: true,
        count: assignedRequests.length,
        data: assignedRequests,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error fetching assigned requests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch assigned service requests',
      });
    }
  },

  /**
   * PATCH /api/admin/service-requests/:id/status
   * Update service request status (ADMIN ONLY)
   */
  updateServiceRequestStatus: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Updating service request status');

    try {
      // Check admin role
      if (req.user?.role !== 'admin') {
        console.log('[SERVICE_REQUEST_CONTROLLER] Non-admin attempted status update');
        return res.status(403).json({ message: 'Only admins can update service request status' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[SERVICE_REQUEST_CONTROLLER] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, note } = req.body;
      const adminId = req.user?.userId;

      if (!id || !status || !adminId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const validStatuses = ['pending', 'approved', 'assigned', 'in_progress', 'completed', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const updatedRequest = await ServiceRequestService.updateServiceRequestStatus(id, status, note || '', adminId);

      console.log('[SERVICE_REQUEST_CONTROLLER] Status updated successfully');

      res.status(200).json({
        success: true,
        message: 'Service request status updated',
        data: updatedRequest,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error updating status:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update service request status',
      });
    }
  },

  /**
   * PATCH /api/admin/service-requests/:id/assign
   * Assign service request to installer (ADMIN ONLY)
   */
  assignServiceRequest: async (req: AuthRequest, res: Response) => {
    console.log('[SERVICE_REQUEST_CONTROLLER] Assigning service request');

    try {
      // Check admin role
      if (req.user?.role !== 'admin') {
        console.log('[SERVICE_REQUEST_CONTROLLER] Non-admin attempted assignment');
        return res.status(403).json({ message: 'Only admins can assign service requests' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[SERVICE_REQUEST_CONTROLLER] Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { assignToUserId } = req.body;
      const adminId = req.user?.userId;

      if (!id || !assignToUserId || !adminId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const updatedRequest = await ServiceRequestService.assignServiceRequest(id, assignToUserId, adminId);

      console.log('[SERVICE_REQUEST_CONTROLLER] Assignment completed successfully');

      res.status(200).json({
        success: true,
        message: 'Service request assigned successfully',
        data: updatedRequest,
      });
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_CONTROLLER] Error assigning request:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign service request',
      });
    }
  },
};

// ============================================
// ADMIN SERVICE REQUEST CONTROLLER
// ============================================
export const adminServiceRequestController = {
  /**
   * GET /api/admin/service-requests
   * Get all service requests (with optional filters)
   */
  getAllServiceRequests: async (req: AuthRequest, res: Response) => {
    console.log('[ADMIN_SERVICE_REQUEST_CONTROLLER] Fetching all service requests');

    try {
      const { status, assignedTo } = req.query;

      const serviceRequests = await ServiceRequestService.getAllServiceRequests(
        status as string | undefined,
        assignedTo as string | undefined
      );

      console.log('[ADMIN_SERVICE_REQUEST_CONTROLLER] Found', serviceRequests.length, 'total requests');

      res.status(200).json({
        success: true,
        count: serviceRequests.length,
        data: serviceRequests,
      });
    } catch (error: any) {
      console.error('[ADMIN_SERVICE_REQUEST_CONTROLLER] Error fetching requests:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch service requests',
      });
    }
  },
};

// ============================================
// NOTIFICATION CONTROLLER
// ============================================
export const notificationController = {
  /**
   * GET /api/notifications
   * Get all notifications for logged-in user
   */
  getNotifications: async (req: AuthRequest, res: Response) => {
    console.log('[NOTIFICATION_CONTROLLER] Fetching notifications');

    try {
      const userId = req.user?.userId;
      const { unreadOnly } = req.query;

      if (!userId) {
        console.log('[NOTIFICATION_CONTROLLER] No user ID in request');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { notifications: appNotifications } = await AppNotificationService.getUserNotifications(userId, {
        read: unreadOnly === 'true' ? false : undefined,
      });
      const serviceNotifications = await ServiceRequestNotificationService.getUserNotifications(
        userId,
        unreadOnly === 'true'
      );

      const notifications = [...appNotifications, ...serviceNotifications].sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

      console.log('[NOTIFICATION_CONTROLLER] Found', notifications.length, 'notifications');

      res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (error: any) {
      console.error('[NOTIFICATION_CONTROLLER] Error fetching notifications:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch notifications',
      });
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * Mark notification as read
   */
  markNotificationAsRead: async (req: AuthRequest, res: Response) => {
    console.log('[NOTIFICATION_CONTROLLER] Marking notification as read');

    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'Notification ID is required' });
      }

      let notification: any = await AppNotificationService.markAsRead(id);

      if (!notification) {
        try {
          notification = await ServiceRequestNotificationService.markNotificationAsRead(id);
        } catch (serviceError: any) {
          return res.status(404).json({ message: 'Notification not found' });
        }
      }

      console.log('[NOTIFICATION_CONTROLLER] Notification marked as read');

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error: any) {
      console.error('[NOTIFICATION_CONTROLLER] Error marking notification as read:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark notification as read',
      });
    }
  },

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   */
  markAllNotificationsAsRead: async (req: AuthRequest, res: Response) => {
    console.log('[NOTIFICATION_CONTROLLER] Marking all notifications as read');

    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const appCount = await AppNotificationService.markAllAsRead(userId);
      const serviceCount = await ServiceRequestNotificationService.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: { appCount, serviceCount }
      });
    } catch (error: any) {
      console.error('[NOTIFICATION_CONTROLLER] Error marking all as read:', error.message);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark all notifications as read',
      });
    }
  },

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  deleteNotification: async (req: AuthRequest, res: Response) => {
    console.log('[NOTIFICATION_CONTROLLER] Deleting notification');

    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'Notification ID is required' });
      }

      let deleted = false;
      try {
        deleted = await AppNotificationService.deleteNotification(id);
      } catch (appErr) {
        console.warn('[NOTIFICATION_CONTROLLER] App notification delete failed:', appErr);
      }

      if (!deleted) {
        try {
          deleted = await ServiceRequestNotificationService.deleteNotification(id);
        } catch (serviceErr) {
          console.warn('[NOTIFICATION_CONTROLLER] Service notification delete failed:', serviceErr);
        }
      }

      if (!deleted) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      return res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
      console.error('[NOTIFICATION_CONTROLLER] Error deleting notification:', error.message);
      return res.status(500).json({ message: error.message || 'Failed to delete notification' });
    }
  },

  /**
   * DELETE /api/notifications
   * Delete all notifications for logged-in user
   */
  deleteAllNotifications: async (req: AuthRequest, res: Response) => {
    console.log('[NOTIFICATION_CONTROLLER] Deleting all notifications');

    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const appCount = await AppNotificationService.deleteAllNotifications(userId);
      const serviceCount = await ServiceRequestNotificationService.deleteAllNotifications(userId);

      return res.status(200).json({
        success: true,
        message: 'All notifications deleted',
        data: { appCount, serviceCount }
      });
    } catch (error: any) {
      console.error('[NOTIFICATION_CONTROLLER] Error deleting all notifications:', error.message);
      return res.status(500).json({ message: error.message || 'Failed to delete all notifications' });
    }
  },
};
