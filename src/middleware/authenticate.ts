import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    const decodedPayload = verifyToken(token);
    req.user = decodedPayload;
    return next();
  } catch (error) {
    return sendError(res, 'Invalid or expired session token.', 401);
  }
};
