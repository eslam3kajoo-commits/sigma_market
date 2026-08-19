import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().uuid().optional(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1)
    })).min(1)
  })
});

export const createOrder = async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { addressId, items } = req.body;

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return sendError(res, `Product ${item.productId} not found.`, 404);
      }
      if (product.stock < item.quantity) {
        return sendError(res, `Insufficient stock for product ${product.name}.`, 400);
      }
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price
      });
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        addressId: addressId || undefined,
        totalAmount,
        status: 'PENDING',
        items: {
          create: orderItemsData
        }
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    // Deduct inventory stock
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }

    return sendSuccess(res, 'Order created successfully.', { order }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to create order.', 500, error.message);
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.roleName;

    const where: any = {};
    if (userRole !== 'Admin') {
      where.customerId = userId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payments: true,
        delivery: true,
        warranties: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Orders list retrieved.', { orders });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch orders.', 500, error.message);
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        payments: true,
        delivery: true,
        warranties: true
      }
    });

    if (!order) {
      return sendError(res, 'Order not found.', 404);
    }

    return sendSuccess(res, 'Order details retrieved.', { order });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch order details.', 500, error.message);
  }
};
