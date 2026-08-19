import { UserJwtPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: UserJwtPayload;
    }
  }
}
