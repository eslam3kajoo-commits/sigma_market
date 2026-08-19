import { Router } from 'express';
import { createOrder, createOrderSchema, getOrders, getOrderById } from './orders.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

export default router;
