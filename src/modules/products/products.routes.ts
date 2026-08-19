import { Router } from 'express';
import {
  getAllProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema
} from './products.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

// Public / Authenticated catalog search and lookup
router.get('/', getAllProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);

// Protected routes for Merchant and Admin
router.post('/', authenticate, requireRole('Merchant', 'Admin'), validate(createProductSchema), createProduct);
router.put('/:id', authenticate, requireRole('Merchant', 'Admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authenticate, requireRole('Merchant', 'Admin'), deleteProduct);

export default router;
