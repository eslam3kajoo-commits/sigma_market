import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface UserJwtPayload {
  userId: string;
  email: string;
  roleName: string;
  roleId: string;
}

export const generateToken = (payload: UserJwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any
  });
};

export const verifyToken = (token: string): UserJwtPayload => {
  return jwt.verify(token, config.jwtSecret) as UserJwtPayload;
};
