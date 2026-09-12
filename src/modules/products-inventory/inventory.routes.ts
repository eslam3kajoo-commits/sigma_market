import { Router } from 'express';
import {
  addInventoryMovement,
  inventoryMovementSchema,
  getInventoryList,
  getProductInventoryDetails
} from './inventory.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getInventoryList);
router.get('/product/:productId', getProductInventoryDetails);
router.post('/movement', requireRole('Admin', 'Merchant'), validate(inventoryMovementSchema), addInventoryMovement);

export default router;
