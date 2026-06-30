import { AppDataSource } from '../config/database';
import { ServiceRequest, ServiceRequestUpdate, ServiceNotification } from '../models/ServiceRequest';
import { User, UserRole } from '../models/User';
import { emailService } from './emailService';
import { In } from 'typeorm';
import { NotificationService as AppNotificationService } from './notificationService';
import { NotificationType } from '../models/Notification';

// ============================================
// SERVICE REQUEST SERVICE
// ============================================
export class ServiceRequestService {
  private static getUserDisplayName(user?: Partial<User> | null) {
    if (!user) return '';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || (user as any).name || user.email || '';
  }

  private static async attachAssignedInstallerDetails(requests: ServiceRequest[]): Promise<any[]> {
    const userRepo = AppDataSource.getRepository(User);
    const missingAssignedUserIds = Array.from(
      new Set(
        requests
          .filter((request) => request.assignedTo && !request.assignedUser)
          .map((request) => request.assignedTo as string)
      )
    );

    let usersById: Record<string, Partial<User>> = {};
    if (missingAssignedUserIds.length > 0) {
      const users = await userRepo.find({
        where: { id: In(missingAssignedUserIds) },
        select: ['id', 'firstName', 'lastName', 'name', 'email', 'phone', 'role'],
      });
      usersById = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, Partial<User>>);
    }

    return requests.map((request) => {
      const resolvedAssignedUser = request.assignedUser || usersById[request.assignedTo || ''] || null;
      return {
        ...request,
        assignedUser: resolvedAssignedUser,
        assignedInstallerName: this.getUserDisplayName(resolvedAssignedUser),
        assignedInstallerEmail: resolvedAssignedUser?.email || null,
      };
    });
  }

  static async createServiceRequest(
    userId: string,
    fullName: string,
    email: string,
    phone: string,
    serviceType: string,
    message: string,
    role: 'customer' | 'vendor' | 'installer',
    isPaid: boolean = false
  ) {
    console.log('[SERVICE_REQUEST_SERVICE] Creating service request for user:', userId);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const serviceRequest = serviceRequestRepo.create({
        userId,
        role,
        fullName,
        email,
        phone,
        serviceType,
        message,
        status: 'pending',
        isPaid,
      });

      const saved = await serviceRequestRepo.save(serviceRequest);
      console.log('[SERVICE_REQUEST_SERVICE] Service request created:', saved.id);

      // Create audit log entry
      await this.logStatusChange(saved.id, null, 'pending', userId, 'Service request submitted');

      // Create notification for admins
      await NotificationService.notifyAdmins(
        `New Service Request from ${fullName}`,
        `${fullName} submitted a new service request for: ${serviceType}`,
        saved.id
      );

      return saved;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error creating service request:', error.message);
      throw error;
    }
  }

  static async getServiceRequestById(id: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Fetching service request:', id);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const request = await serviceRequestRepo.findOne({
        where: { id },
        relations: ['user', 'assignedUser', 'updates', 'updates.updatedByUser', 'notifications'],
        order: {
          updates: { createdAt: 'DESC' },
          notifications: { createdAt: 'DESC' },
        },
      });

      if (!request) {
        throw new Error('Service request not found');
      }

      const [enrichedRequest] = await this.attachAssignedInstallerDetails([request]);

      console.log('[SERVICE_REQUEST_SERVICE] Service request fetched:', request.id);
      return enrichedRequest;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error fetching service request:', error.message);
      throw error;
    }
  }

  static async getUserServiceRequests(userId: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Fetching service requests for user:', userId);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const requests = await serviceRequestRepo.find({
        where: { userId },
        relations: ['user', 'assignedUser', 'updates', 'updates.updatedByUser'],
        order: { createdAt: 'DESC' },
      });

      const enrichedRequests = await this.attachAssignedInstallerDetails(requests);

      console.log('[SERVICE_REQUEST_SERVICE] Found', requests.length, 'requests for user');
      return enrichedRequests;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error fetching user requests:', error.message);
      throw error;
    }
  }

  static async getAssignedServiceRequests(installerId: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Fetching assigned service requests for installer:', installerId);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const requests = await serviceRequestRepo.find({
        where: { assignedTo: installerId },
        relations: ['user', 'assignedUser', 'updates', 'updates.updatedByUser'],
        order: { createdAt: 'DESC' },
      });

      const enrichedRequests = await this.attachAssignedInstallerDetails(requests);

      console.log('[SERVICE_REQUEST_SERVICE] Found', requests.length, 'assigned requests');
      return enrichedRequests;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error fetching assigned requests:', error.message);
      throw error;
    }
  }

  static async getAllServiceRequests(status?: string, assignedTo?: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Fetching all service requests. Status:', status, 'Assigned to:', assignedTo);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      let query = serviceRequestRepo
        .createQueryBuilder('sr')
        .leftJoinAndSelect('sr.user', 'user')
        .leftJoinAndSelect('sr.assignedUser', 'assignedUser')
        .leftJoinAndSelect('sr.updates', 'updates')
        .leftJoinAndSelect('updates.updatedByUser', 'updatedByUser')
        .orderBy('sr.createdAt', 'DESC');

      if (status) {
        query = query.where('sr.status = :status', { status });
      }

      if (assignedTo) {
        query = query.andWhere('sr.assignedTo = :assignedTo', { assignedTo });
      }

      const requests = await query.getMany();
      const enrichedRequests = await this.attachAssignedInstallerDetails(requests);

      console.log('[SERVICE_REQUEST_SERVICE] Found', requests.length, 'total requests');
      return enrichedRequests;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error fetching all requests:', error.message);
      throw error;
    }
  }

  static async updateServiceRequestStatus(
    requestId: string,
    newStatus: string,
    note: string,
    adminId: string
  ) {
    console.log('[SERVICE_REQUEST_SERVICE] Updating status for request:', requestId, 'to:', newStatus);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const request = await serviceRequestRepo.findOne({
        where: { id: requestId },
        relations: ['user'],
      });

      if (!request) {
        throw new Error('Service request not found');
      }

      const oldStatus = request.status;
      request.status = newStatus as any;

      await serviceRequestRepo.save(request);

      // Log the status change
      await this.logStatusChange(requestId, oldStatus, newStatus, adminId, note);

      // Create notification for user
      await NotificationService.notifyUser(
        request.userId,
        `Service Request Status Updated`,
        `Your service request status has been updated to: ${newStatus}`,
        requestId
      );

      // Send email based on status
      if (newStatus === 'approved') {
        await emailService.sendServiceRequestApprovedEmail(request.email, request.fullName);
      } else if (newStatus === 'rejected') {
        await emailService.sendServiceRequestRejectedEmail(request.email, request.fullName, note);
      } else if (newStatus === 'completed') {
        await emailService.sendServiceRequestCompletedEmail(request.email, request.fullName);
      }

      console.log('[SERVICE_REQUEST_SERVICE] Status updated successfully');
      return request;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error updating status:', error.message);
      throw error;
    }
  }

  static async assignServiceRequest(requestId: string, assignToUserId: string, adminId: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Assigning request:', requestId, 'to:', assignToUserId);

    const serviceRequestRepo = AppDataSource.getRepository(ServiceRequest);

    try {
      const request = await serviceRequestRepo.findOne({
        where: { id: requestId },
        relations: ['user'],
      });

      if (!request) {
        throw new Error('Service request not found');
      }

      const previousStatus = request.status;

      const assignedUser = await AppDataSource.getRepository(User).findOne({
        where: { id: assignToUserId },
      });

      if (!assignedUser) {
        throw new Error('Assigned installer not found');
      }

      if (assignedUser.role !== UserRole.INSTALLER) {
        throw new Error('Assigned user must have installer role');
      }

      request.assignedTo = assignToUserId;
      request.status = 'assigned';
      request.assignedUser = assignedUser;

      await serviceRequestRepo.save(request);

      // Log the assignment
      await this.logStatusChange(requestId, previousStatus, 'assigned', adminId, `Assigned to installer`);

      // Notify the assigned installer in service notifications
      try {
        await NotificationService.notifyUser(
          assignToUserId,
          'New Service Request Assigned',
          `You have been assigned a new service request from ${request.fullName} (${request.serviceType}).`,
          requestId
        );
      } catch (notifyError: any) {
        console.warn('[SERVICE_REQUEST_SERVICE] Service notification failed:', notifyError?.message || notifyError);
      }

      // Also send to app-wide notifications so it appears in the bell consistently
      try {
        await AppNotificationService.createNotification(
          assignToUserId,
          NotificationType.JOB,
          'New Service Request Assigned',
          `You have been assigned "${request.serviceType}" for ${request.fullName}.`,
          { relatedId: requestId, actionUrl: '/installer-dashboard' }
        );
      } catch (notifyError: any) {
        console.warn('[SERVICE_REQUEST_SERVICE] App notification failed:', notifyError?.message || notifyError);
      }

      // Email the installer
      try {
        await emailService.sendServiceRequestAssignedEmail(assignedUser.email, request.fullName, request.serviceType);
      } catch (emailError: any) {
        console.warn('[SERVICE_REQUEST_SERVICE] Installer assignment email failed:', emailError?.message || emailError);
      }

      const [enrichedRequest] = await this.attachAssignedInstallerDetails([request]);

      console.log('[SERVICE_REQUEST_SERVICE] Assignment completed');
      return enrichedRequest;
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error assigning request:', error.message);
      throw error;
    }
  }

  static async logStatusChange(requestId: string, oldStatus: string | null, newStatus: string, updatedBy: string, note: string) {
    console.log('[SERVICE_REQUEST_SERVICE] Logging status change for request:', requestId);

    const updateRepo = AppDataSource.getRepository(ServiceRequestUpdate);

    try {
      const update = updateRepo.create({
        requestId,
        oldStatus,
        newStatus,
        note,
        updatedBy,
      });

      await updateRepo.save(update);
      console.log('[SERVICE_REQUEST_SERVICE] Status change logged');
    } catch (error: any) {
      console.error('[SERVICE_REQUEST_SERVICE] Error logging status change:', error.message);
    }
  }
}

// ============================================
// NOTIFICATION SERVICE
// ============================================
export class NotificationService {
  static async createNotification(userId: string, title: string, message: string, serviceRequestId?: string) {
    console.log('[NOTIFICATION_SERVICE] Creating notification for user:', userId);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      const notification = notificationRepo.create({
        userId,
        title,
        message,
        serviceRequestId: serviceRequestId || null,
      });

      const saved = await notificationRepo.save(notification);
      console.log('[NOTIFICATION_SERVICE] Notification created:', saved.id);
      return saved;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error creating notification:', error.message);
      throw error;
    }
  }

  static async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    console.log('[NOTIFICATION_SERVICE] Fetching notifications for user:', userId, 'Unread only:', unreadOnly);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      let query = notificationRepo
        .createQueryBuilder('n')
        .where('n.user_id = :userId', { userId })
        .orderBy('n.createdAt', 'DESC');

      if (unreadOnly) {
        query = query.andWhere('n.is_read = false');
      }

      const notifications = await query.getMany();
      console.log('[NOTIFICATION_SERVICE] Found', notifications.length, 'notifications');
      return notifications;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error fetching notifications:', error.message);
      throw error;
    }
  }

  static async markNotificationAsRead(notificationId: string) {
    console.log('[NOTIFICATION_SERVICE] Marking notification as read:', notificationId);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      const notification = await notificationRepo.findOne({ where: { id: notificationId } });

      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.isRead = true;
      await notificationRepo.save(notification);

      console.log('[NOTIFICATION_SERVICE] Notification marked as read');
      return notification;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error marking notification as read:', error.message);
      throw error;
    }
  }

  static async markAllAsRead(userId: string): Promise<number> {
    console.log('[NOTIFICATION_SERVICE] Marking all notifications as read for user:', userId);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      const result = await notificationRepo
        .createQueryBuilder()
        .update(ServiceNotification)
        .set({ isRead: true })
        .where('user_id = :userId', { userId })
        .andWhere('is_read = false')
        .execute();

      return result.affected || 0;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error marking all as read:', error.message);
      throw error;
    }
  }

  static async deleteNotification(notificationId: string): Promise<boolean> {
    console.log('[NOTIFICATION_SERVICE] Deleting notification:', notificationId);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      const result = await notificationRepo.delete({ id: notificationId });
      return (result.affected || 0) > 0;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error deleting notification:', error.message);
      throw error;
    }
  }

  static async deleteAllNotifications(userId: string): Promise<number> {
    console.log('[NOTIFICATION_SERVICE] Deleting all notifications for user:', userId);

    const notificationRepo = AppDataSource.getRepository(ServiceNotification);

    try {
      const result = await notificationRepo.delete({ userId });
      return result.affected || 0;
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error deleting all notifications:', error.message);
      throw error;
    }
  }

  static async notifyUser(userId: string, title: string, message: string, serviceRequestId?: string) {
    return this.createNotification(userId, title, message, serviceRequestId);
  }

  static async notifyAdmins(title: string, message: string, serviceRequestId?: string) {
    console.log('[NOTIFICATION_SERVICE] Notifying all admins');

    const userRepo = AppDataSource.getRepository(User);

    try {
      const admins = await userRepo.find({
        where: { role: UserRole.ADMIN },
      });

      console.log('[NOTIFICATION_SERVICE] Found', admins.length, 'admins');

      for (const admin of admins) {
        await this.createNotification(admin.id, title, message, serviceRequestId);
      }

      console.log('[NOTIFICATION_SERVICE] All admins notified');
    } catch (error: any) {
      console.error('[NOTIFICATION_SERVICE] Error notifying admins:', error.message);
    }
  }
}
