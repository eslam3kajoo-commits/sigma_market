import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

/**
 * Role-Based Access Control (RBAC) Guard Middleware
 * Verifies that the authenticated user belongs to one of the specified allowed roles.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required before authorization check.', 401);
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return sendError(res, `Access forbidden. Required role: ${allowedRoles.join(' or ')}`, 403);
    }

    return next();
  };
};

/**
 * Resource Ownership Isolation Guard Middleware
 * Ensures a user can only access or modify resources matching their own userId or tenant ID.
 * Admins bypass this check to allow platform moderation.
 */
export const requireOwnership = (resourceUserIdParam = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    // Admins have override access
    if (req.user.roleName === 'Admin') {
      return next();
    }

    const targetUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];
    if (targetUserId && targetUserId !== req.user.userId) {
      return sendError(res, 'Access denied. You can only manage your own account or resource.', 403);
    }

    return next();
  };
};
