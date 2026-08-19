import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Custom Rate Limiter Middleware
 * @param windowMs Time frame in milliseconds (e.g. 15 minutes = 900000 ms)
 * @param maxLimit Maximum request attempts per window
 */
export const rateLimiter = (windowMs = 15 * 60 * 1000, maxLimit = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > maxLimit) {
      const retryAfterSeconds = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return sendError(res, `Too many requests. Please try again in ${retryAfterSeconds} seconds.`, 429);
    }

    return next();
  };
};
