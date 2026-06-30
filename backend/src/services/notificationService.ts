import { AppDataSource } from '../config/database';
import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';

export class NotificationService {
  private static notificationRepo = AppDataSource.getRepository(Notification);

  /**
   * Create a new notification for a user
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      relatedId?: string;
      actionUrl?: string;
    }
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepo.create({
        userId,
        type,
        title,
        message,
        relatedId: options?.relatedId,
        actionUrl: options?.actionUrl,
        read: false,
      });

      const saved = await this.notificationRepo.save(notification);
      console.log(`✅ Notification created for user ${userId}:`, title);
      return saved;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    filter?: {
      type?: NotificationType;
      read?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let query = this.notificationRepo
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId })
        .andWhere('notification.deleted = :deleted', { deleted: false })
        .orderBy('notification.createdAt', 'DESC');

      if (filter?.type) {
        query = query.andWhere('notification.type = :type', { type: filter.type });
      }

      if (filter?.read !== undefined) {
        query = query.andWhere('notification.read = :read', { read: filter.read });
      }

      const limit = filter?.limit || 50;
      const offset = filter?.offset || 0;

      const [notifications, total] = await query
        .take(limit)
        .skip(offset)
        .getManyAndCount();

      return { notifications, total };
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<Notification | null> {
    try {
      const notification = await this.notificationRepo.findOne({ where: { id: notificationId } });
      if (!notification) {
        return null;
      }

      notification.read = true;
      notification.readAt = new Date();
      return await this.notificationRepo.save(notification);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(Notification)
        .set({ read: true, readAt: new Date() })
        .where('userId = :userId', { userId })
        .andWhere('read = :read', { read: false })
        .execute();

      return result.affected || 0;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(Notification)
        .set({ deleted: true })
        .where('id = :id', { id: notificationId })
        .execute();

      return (result.affected || 0) > 0;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  static async deleteAllNotifications(userId: string): Promise<number> {
    try {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(Notification)
        .set({ deleted: true })
        .where('userId = :userId', { userId })
        .execute();

      return result.affected || 0;
    } catch (error) {
      console.error('❌ Error deleting all notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await this.notificationRepo.count({
        where: { userId, read: false, deleted: false },
      });
      return count;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }
  }
}
