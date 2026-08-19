import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const requestDonationSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1)
  })
});

export const requestDonation = async (req: Request, res: Response) => {
  try {
    const charityId = req.user?.userId;
    if (!charityId) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { productId, quantity } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    const donation = await prisma.donation.create({
      data: {
        charityId,
        productId,
        quantity,
        status: 'REQUESTED'
      },
      include: {
        product: { select: { name: true, barcode: true } }
      }
    });

    return sendSuccess(res, 'Donation requested successfully.', { donation }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to request donation.', 500, error.message);
  }
};

export const getDonations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roleName;

    const where: any = {};
    if (userRole === 'Charity') {
      where.charityId = userId;
    }

    const donations = await prisma.donation.findMany({
      where,
      include: {
        product: { select: { name: true, barcode: true, price: true } },
        charity: { select: { fullName: true, email: true } }
      },
      orderBy: { requestedAt: 'desc' }
    });

    return sendSuccess(res, 'Donations list retrieved.', { donations });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch donations list.', 500, error.message);
  }
};
