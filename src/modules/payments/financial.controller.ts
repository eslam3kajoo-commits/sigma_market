import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { auditLogger } from '../../utils/auditLogger';

export const mockCheckoutSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    paymentMethod: z.string().default('CARD')
  })
});

export const assignDeliverySchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    driverName: z.string().min(2),
    driverPhone: z.string().min(5),
    deliveryStatus: z.enum(['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED']).default('OUT_FOR_DELIVERY')
  })
});

// Helper to fetch platform commission rate
async function getPlatformCommissionRate(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { settingKey: 'PLATFORM_COMMISSION' }
  });
  return setting ? setting.commissionRate : 0.10; // Default 10%
}

export const mockCheckout = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });

    if (!order) {
      return sendError(res, 'Order not found.', 404);
    }

    const commissionRate = await getPlatformCommissionRate();
    const platformCommission = order.totalAmount * commissionRate;
    const netMerchantAmount = order.totalAmount - platformCommission;

    // Create or update Payment record
    const payment = await prisma.payment.upsert({
      where: { orderId },
      update: { status: 'PAID', amount: order.totalAmount },
      create: {
        orderId,
        amount: order.totalAmount,
        status: 'PAID'
      }
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PROCESSING' }
    });

    // Auto generate warranties for purchased products
    for (const item of order.items) {
      const serialNumber = `WAR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const qrCode = `QR-SWP-${serialNumber}`;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // Default 1 year

      await prisma.warranty.create({
        data: {
          serialNumber,
          qrCode,
          productId: item.productId,
          orderId: order.id,
          startDate,
          endDate,
          status: 'ACTIVE'
        }
      });
    }

    await auditLogger.log('PAYMENT_MOCK_CHECKOUT', req.user?.userId || 'GUEST', {
      orderId,
      amount: order.totalAmount,
      commissionRate,
      platformCommission,
      netMerchantAmount
    }, req.ip);

    return sendSuccess(res, 'Mock checkout processed successfully.', {
      payment,
      financialSummary: {
        orderTotal: order.totalAmount,
        commissionRate: `${(commissionRate * 100).toFixed(1)}%`,
        platformCommission,
        netMerchantAmount
      }
    });
  } catch (error: any) {
    return sendError(res, 'Failed to process checkout.', 500, error.message);
  }
};

export const getMerchantPayouts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // merchantId / profileId / userId

    // Find merchant profile or user
    const merchantProfile = await prisma.merchantProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }]
      }
    });

    if (!merchantProfile) {
      return sendError(res, 'Merchant profile not found.', 404);
    }

    const commissionRate = await getPlatformCommissionRate();

    // Fetch products sold by merchant
    const merchantProducts = await prisma.product.findMany({
      where: { merchantId: merchantProfile.userId },
      select: { id: true }
    });

    const productIds = merchantProducts.map(p => p.id);

    // Fetch order items sold
    const orderItems = await prisma.orderItem.findMany({
      where: { productId: { in: productIds } },
      include: {
        order: {
          include: { payments: true }
        }
      }
    });

    // Calculate total paid sales
    let totalSales = 0;
    orderItems.forEach(item => {
      const isPaid = item.order.payments.some(p => p.status === 'PAID');
      if (isPaid) {
        totalSales += item.unitPrice * item.quantity;
      }
    });

    const totalCommission = totalSales * commissionRate;
    const netPayoutAmount = totalSales - totalCommission;

    // Retrieve previous payout records
    const existingPayouts = await prisma.payout.findMany({
      where: { merchantId: merchantProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Merchant payout metrics calculated.', {
      merchant: {
        id: merchantProfile.id,
        companyName: merchantProfile.companyName,
        status: merchantProfile.status
      },
      financialSummary: {
        totalSales,
        commissionRate: `${(commissionRate * 100).toFixed(1)}%`,
        platformCommission: totalCommission,
        netPayoutAmount
      },
      payoutHistory: existingPayouts
    });
  } catch (error: any) {
    return sendError(res, 'Failed to calculate merchant payouts.', 500, error.message);
  }
};

export const assignDelivery = async (req: Request, res: Response) => {
  try {
    const { orderId, driverName, driverPhone, deliveryStatus } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return sendError(res, 'Order not found.', 404);
    }

    const delivery = await prisma.delivery.upsert({
      where: { orderId },
      update: {
        driverName,
        driverPhone,
        deliveryStatus
      },
      create: {
        orderId,
        driverName,
        driverPhone,
        deliveryStatus: deliveryStatus || 'OUT_FOR_DELIVERY'
      }
    });

    // Update order status matching delivery status
    let newOrderStatus = order.status;
    if (deliveryStatus === 'OUT_FOR_DELIVERY') newOrderStatus = 'SHIPPED';
    if (deliveryStatus === 'DELIVERED') newOrderStatus = 'DELIVERED';

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newOrderStatus }
    });

    await auditLogger.log('ASSIGN_DELIVERY', req.user?.userId || 'SYSTEM', {
      orderId,
      driverName,
      deliveryStatus
    }, req.ip);

    return sendSuccess(res, `Delivery assigned and status updated to '${deliveryStatus}'.`, { delivery });
  } catch (error: any) {
    return sendError(res, 'Failed to assign delivery.', 500, error.message);
  }
};
