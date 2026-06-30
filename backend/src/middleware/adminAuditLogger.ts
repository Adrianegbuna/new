import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { AdminAuditService } from '../services/adminAuditService';

const sanitizeBody = (body: unknown): Record<string, unknown> | undefined => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const unsafe = body as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  Object.keys(unsafe).forEach((key) => {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('authorization')
    ) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = unsafe[key];
    }
  });

  return clean;
};

export const adminAuditLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (!isMutating) {
    next();
    return;
  }

  const requestBody = sanitizeBody(req.body);
  const startedAt = Date.now();

  res.on('finish', () => {
    const actorUserId = req.user?.userId;
    if (!actorUserId) return;
    if (req.path.includes('/audit-logs')) return;

    void AdminAuditService.log({
      actorUserId,
      action: `${method} ${req.baseUrl}${req.path}`,
      targetType: req.path.split('/').filter(Boolean)[0] || 'unknown',
      targetId: req.params?.id,
      metadata: {
        query: req.query,
        body: requestBody,
        durationMs: Date.now() - startedAt,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      statusCode: res.statusCode,
    });
  });

  next();
};

