import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response) => {
  return sendSuccess(res, 'Dynamic Pricing API structure ready.', { discounts: [] });
});

export default router;
