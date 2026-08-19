import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const inventoryMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    type: z.enum(['ADD', 'DEDUCT', 'ADJUSTMENT']),
    quantity: z.number().int().min(1),
    reason: z.string().min(3)
  })
});

export const addInventoryMovement = async (req: Request, res: Response) => {
  try {
    const createdById = req.user?.userId;
    if (!createdById) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { productId, type, quantity, reason } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    // Upsert Inventory record
    let inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: {
          productId,
          merchantId: product.merchantId,
          quantity: product.stock
        }
      });
    }

    // Create movement
    const movement = await prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type,
        quantity,
        reason,
        createdById
      }
    });

    // Update stock quantity
    let stockDelta = quantity;
    if (type === 'DEDUCT') stockDelta = -quantity;
    if (type === 'ADJUSTMENT') stockDelta = quantity - inventory.quantity;

    const updatedInventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: { quantity: { increment: stockDelta } }
    });

    await prisma.product.update({
      where: { id: productId },
      data: { stock: updatedInventory.quantity }
    });

    return sendSuccess(res, 'Inventory movement recorded.', { movement, inventory: updatedInventory }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to record inventory movement.', 500, error.message);
  }
};

export const getInventoryList = async (req: Request, res: Response) => {
  try {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: { select: { name: true, barcode: true, price: true } },
        movements: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });

    return sendSuccess(res, 'Inventory list retrieved.', { inventories });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch inventory list.', 500, error.message);
  }
};
