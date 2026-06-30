import { Router } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { notificationController } from '../controllers/serviceRequestController';

const router = Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead);
router.delete('/', authMiddleware, notificationController.deleteAllNotifications);

router.patch(
  '/:id/read',
  authMiddleware,
  [param('id').isUUID().withMessage('Invalid notification ID')],
  notificationController.markNotificationAsRead
);

router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('Invalid notification ID')],
  notificationController.deleteNotification
);

export default router;
