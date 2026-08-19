import { Router } from 'express';
import {
  getSystemMetrics,
  getAdminUsersList,
  toggleUserStatus,
  updateUserStatusSchema,
  getPendingApprovals,
  setOrUpdateCommission,
  commissionSchema,
  getAuditLogs
} from './admin.controller';
import { updateUserRole, changeRoleSchema } from '../users/users.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

// All routes under /api/admin require authentication AND Admin role
router.use(authenticate, requireRole('Admin'));

router.get('/metrics', getSystemMetrics);
router.get('/users', getAdminUsersList);
router.patch('/users/:id/status', validate(updateUserStatusSchema), toggleUserStatus);
router.put('/users/:id/role', validate(changeRoleSchema), updateUserRole);

// Part 2 Admin Specific Endpoints
router.get('/pending-approvals', getPendingApprovals);
router.post('/commissions', validate(commissionSchema), setOrUpdateCommission);
router.patch('/commissions', validate(commissionSchema), setOrUpdateCommission);
router.get('/audit-logs', getAuditLogs);

export default router;
