import { Router } from 'express';
import { requestDonation, requestDonationSchema, getDonations } from './donations.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', getDonations);
router.post('/request', requireRole('Charity', 'Admin'), validate(requestDonationSchema), requestDonation);

export default router;
