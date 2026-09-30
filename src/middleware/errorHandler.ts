import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[Internal Server Error]:', err);
  } else {
    console.warn(`[Client Error ${status}]:`, err.message || err);
  }

  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error occurred.'
    : (err.message || 'An unexpected error occurred.');

  return sendError(res, message, status);
};
