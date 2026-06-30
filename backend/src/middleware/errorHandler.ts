/**
 * Error Handling Middleware
 * Hides sensitive error information from users
 */

import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  statusCode: number;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;

  // Log detailed error in server (for debugging)
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  // Build response based on environment
  let message = 'An error occurred. Please try again.';
  let code = 'INTERNAL_ERROR';

  if (!isProduction) {
    // Development: provide more details
    message = err.message || 'An error occurred';
    code = err.code || statusCode.toString();
  } else {
    // Production: generic messages only
    if (statusCode === 400) {
      message = 'Invalid request. Please check your input.';
      code = 'INVALID_REQUEST';
    } else if (statusCode === 401) {
      message = 'Unauthorized. Please log in.';
      code = 'UNAUTHORIZED';
    } else if (statusCode === 403) {
      message = 'Access denied.';
      code = 'FORBIDDEN';
    } else if (statusCode === 404) {
      message = 'Resource not found.';
      code = 'NOT_FOUND';
    } else if (statusCode >= 500) {
      message = 'Server error. Please try again later.';
      code = 'SERVER_ERROR';
    }
  }

  const response: ErrorResponse = {
    success: false,
    message,
    code,
    statusCode,
  };

  res.status(statusCode).json(response);
};

/**
 * Safe error message - returns generic message in production
 */
export const getSafeErrorMessage = (error: any, statusCode: number = 500): string => {
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 400) return 'Invalid request. Please check your input.';
    if (statusCode === 401) return 'Unauthorized. Please log in.';
    if (statusCode === 403) return 'Access denied.';
    if (statusCode === 404) return 'Resource not found.';
    return 'An error occurred. Please try again.';
  }

  // Development mode - show actual error
  return error.message || 'Unknown error';
};
