import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategorySchema,
  updateCategorySchema
} from './categories.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

// Public routes for category listing & lookup
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// Protected routes for Admin and Merchant
router.post('/', authenticate, requireRole('Admin', 'Merchant'), validate(createCategorySchema), createCategory);
router.put('/:id', authenticate, requireRole('Admin', 'Merchant'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', authenticate, requireRole('Admin', 'Merchant'), deleteCategory);

export default router;
