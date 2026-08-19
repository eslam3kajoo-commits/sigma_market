import { Router } from 'express';
import { registerUser, loginUser, logoutUser, getCurrentUser, registerSchema, loginSchema } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', authenticate, logoutUser);
router.get('/me', authenticate, getCurrentUser);

export default router;
