import { AppDataSource } from '../config/database';
import { AdminAuditLog } from '../models/AdminAuditLog';

interface LogInput {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
}

export class AdminAuditService {
  static async log(input: LogInput): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(AdminAuditLog);
      const entry = repo.create(input);
      await repo.save(entry);
    } catch (error) {
      console.warn('[AUDIT] Failed to log admin action:', error);
    }
  }
}

