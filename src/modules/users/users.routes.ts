import { Router } from 'express';
import { getAllUsers, getUserById, updateUserProfile, updateUserRole, updateUserSchema, changeRoleSchema } from './users.controller';
import { getUserAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, createAddressSchema, updateAddressSchema } from './address.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole, requireOwnership } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

// Address Management Routes (Authenticated)
router.get('/addresses', authenticate, getUserAddresses);
router.post('/addresses', authenticate, validate(createAddressSchema), addAddress);
router.put('/addresses/:id', authenticate, validate(updateAddressSchema), updateAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);
router.patch('/addresses/:id/default', authenticate, setDefaultAddress);

// Admin-only listing of all users
router.get('/', authenticate, requireRole('Admin'), getAllUsers);

// User profile retrieval & update (Ownership protected or Admin)
router.get('/:id', authenticate, requireOwnership('id'), getUserById);
router.put('/:id', authenticate, requireOwnership('id'), validate(updateUserSchema), updateUserProfile);

// Admin-only critical action: Changing user role
router.put('/:id/role', authenticate, requireRole('Admin'), validate(changeRoleSchema), updateUserRole);

export default router;
