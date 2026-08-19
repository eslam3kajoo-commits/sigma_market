import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { auditLogger } from '../../utils/auditLogger';

export const generateWarrantySchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    orderId: z.string().uuid(),
    durationMonths: z.number().int().min(1).default(12)
  })
});

export const createClaimSchema = z.object({
  body: z.object({
    warrantyId: z.string().uuid(),
    issueDescription: z.string().min(5),
    claimType: z.enum(['REPAIR', 'REPLACEMENT']).default('REPAIR')
  })
});

export const updateClaimStatusSchema = z.object({
  body: z.object({
    claimStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'])
  })
});

export const generateWarranty = async (req: Request, res: Response) => {
  try {
    const { productId, orderId, durationMonths } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return sendError(res, 'Order not found.', 404);
    }

    const serialNumber = `WAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const qrCode = `QR-SWP-${serialNumber}`;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (durationMonths || 12));

    const warranty = await prisma.warranty.create({
      data: {
        serialNumber,
        qrCode,
        productId,
        orderId,
        startDate,
        endDate,
        status: 'ACTIVE'
      },
      include: {
        product: { select: { name: true, barcode: true } },
        order: { select: { id: true, totalAmount: true } }
      }
    });

    return sendSuccess(res, 'Digital warranty card generated successfully.', { warranty }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to generate warranty.', 500, error.message);
  }
};

export const lookupWarranty = async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    // Search by warranty serialNumber or product barcode
    const warranty = await prisma.warranty.findFirst({
      where: {
        OR: [
          { serialNumber: barcode },
          { product: { barcode: barcode } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            barcode: true,
            price: true,
            merchant: { select: { id: true, fullName: true, email: true } }
          }
        },
        order: {
          select: {
            id: true,
            createdAt: true,
            totalAmount: true,
            status: true
          }
        },
        claims: true
      },
      orderBy: { endDate: 'desc' }
    });

    if (!warranty) {
      return sendError(res, `No active warranty record found for serial/barcode '${barcode}'.`, 404);
    }

    // Auto-check if expired
    const isExpired = new Date() > new Date(warranty.endDate);
    const computedStatus = isExpired ? 'EXPIRED' : warranty.status;

    return sendSuccess(res, 'Warranty information retrieved.', {
      warranty: {
        ...warranty,
        status: computedStatus,
        isExpired
      }
    });
  } catch (error: any) {
    console.error('Lookup Warranty Catch Error:', error);
    return sendError(res, 'Failed to lookup warranty.', 500, error.message);
  }
};

export const createWarrantyClaim = async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { warrantyId, issueDescription, claimType } = req.body;

    const warranty = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    if (!warranty) {
      return sendError(res, 'Warranty record not found.', 404);
    }

    if (new Date() > new Date(warranty.endDate)) {
      return sendError(res, 'Warranty has expired. Claim cannot be submitted.', 400);
    }

    const claim = await prisma.warrantyClaim.create({
      data: {
        warrantyId,
        customerId,
        issueDescription,
        claimType: claimType || 'REPAIR',
        claimStatus: 'PENDING'
      },
      include: {
        warranty: {
          include: { product: true }
        }
      }
    });

    await auditLogger.log('SUBMIT_WARRANTY_CLAIM', customerId, {
      claimId: claim.id,
      warrantyId,
      claimType
    }, req.ip);

    return sendSuccess(res, 'Warranty claim submitted successfully.', { claim }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to submit warranty claim.', 500, error.message);
  }
};

export const updateWarrantyClaimStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { claimStatus } = req.body;

    const existingClaim = await prisma.warrantyClaim.findUnique({ where: { id } });
    if (!existingClaim) {
      return sendError(res, 'Warranty claim not found.', 404);
    }

    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id },
      data: { claimStatus }
    });

    // If claim completed or approved, update warranty status if needed
    if (claimStatus === 'COMPLETED' || claimStatus === 'APPROVED') {
      await prisma.warranty.update({
        where: { id: existingClaim.warrantyId },
        data: { status: 'CLAIMED' }
      });
    }

    await auditLogger.log('UPDATE_CLAIM_STATUS', req.user?.userId || 'SYSTEM', {
      claimId: id,
      newStatus: claimStatus
    }, req.ip);

    return sendSuccess(res, `Warranty claim status updated to ${claimStatus}.`, { claim: updatedClaim });
  } catch (error: any) {
    return sendError(res, 'Failed to update warranty claim status.', 500, error.message);
  }
};
