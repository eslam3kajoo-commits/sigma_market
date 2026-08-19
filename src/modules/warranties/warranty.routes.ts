import { Router } from 'express';
import {
  generateWarranty,
  generateWarrantySchema,
  lookupWarranty,
  createWarrantyClaim,
  createClaimSchema,
  updateWarrantyClaimStatus,
  updateClaimStatusSchema
} from './warranty.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

// Public barcode lookup endpoint
router.get('/lookup/:barcode', lookupWarranty);

// Protected warranty endpoints
router.post('/generate', authenticate, validate(generateWarrantySchema), generateWarranty);
router.post('/claims', authenticate, validate(createClaimSchema), createWarrantyClaim);
router.patch('/claims/:id', authenticate, requireRole('Admin', 'Merchant'), validate(updateClaimStatusSchema), updateWarrantyClaimStatus);

export default router;
