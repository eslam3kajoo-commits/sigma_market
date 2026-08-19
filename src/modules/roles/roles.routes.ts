import { Router } from 'express';
import { getAllRoles } from './roles.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

const router = Router();

// Only Admin can list roles and view permissions definition
router.get('/', authenticate, requireRole('Admin'), getAllRoles);

export default router;
