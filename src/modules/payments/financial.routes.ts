import { Router } from 'express';
import {
  mockCheckout,
  mockCheckoutSchema,
  getMerchantPayouts,
  assignDelivery,
  assignDeliverySchema
} from './financial.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const paymentsRouter = Router();
const payoutsRouter = Router();
const deliveriesRouter = Router();

// Payment endpoints
paymentsRouter.post('/mock-checkout', validate(mockCheckoutSchema), mockCheckout);

// Payout endpoints
payoutsRouter.get('/merchant/:id', authenticate, getMerchantPayouts);

// Delivery endpoints
deliveriesRouter.post('/assign', authenticate, requireRole('Admin', 'Merchant'), validate(assignDeliverySchema), assignDelivery);

export { paymentsRouter, payoutsRouter, deliveriesRouter };
