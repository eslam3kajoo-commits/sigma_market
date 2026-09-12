import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const inventoryMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid Product ID'),
    type: z.enum(['ADD', 'DEDUCT', 'ADJUSTMENT']),
    quantity: z.number().int().min(0, 'Quantity cannot be negative'),
    reason: z.string().min(3, 'Reason is required')
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

    // Security isolation check: Merchant can only manage inventory for their own store products
    if (req.user?.roleName === 'Merchant' && product.merchantId !== createdById) {
      return sendError(res, 'Forbidden. You can only manage inventory for your own products.', 403);
    }

    // Upsert Inventory record
    let inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: {
          productId,
          merchantId: product.merchantId,
          quantity: product.stock,
          minStockLevel: 5
        }
      });
    }

    // Calculate new target inventory quantity
    let currentQty = inventory.quantity;
    let targetQty = currentQty;

    if (type === 'ADD') {
      targetQty = currentQty + quantity;
    } else if (type === 'DEDUCT') {
      targetQty = currentQty - quantity;
    } else if (type === 'ADJUSTMENT') {
      targetQty = quantity;
    }

    // Prevent negative stock
    if (targetQty < 0) {
      return sendError(res, `Operation rejected. Target stock quantity (${targetQty}) cannot be negative. Current stock is ${currentQty}.`, 400);
    }

    // Create movement audit log
    const movement = await prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type,
        quantity,
        reason,
        createdById
      }
    });

    // Update Inventory record
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventory.id },
      data: { quantity: targetQty }
    });

    // Sync Product stock and status
    const updatedProductStatus = targetQty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK';
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: targetQty,
        status: updatedProductStatus
      }
    });

    return sendSuccess(res, 'Inventory movement recorded successfully.', { movement, inventory: updatedInventory }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to record inventory movement.', 500, error.message);
  }
};

export const getInventoryList = async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;

    const whereClause: any = {};
    if (productId) {
      whereClause.productId = String(productId);
    }

    if (req.user?.roleName === 'Merchant') {
      whereClause.merchantId = req.user.userId;
    }

    const inventories = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        product: { select: { id: true, name: true, barcode: true, price: true, status: true, categoryId: true } },
        movements: { orderBy: { createdAt: 'desc' }, take: 10 }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return sendSuccess(res, 'Inventory list retrieved.', { inventories });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch inventory list.', 500, error.message);
  }
};

export const getProductInventoryDetails = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true,
        movements: {
          include: { createdBy: { select: { id: true, fullName: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!inventory) {
      return sendError(res, 'Inventory record for specified product not found.', 404);
    }

    return sendSuccess(res, 'Product inventory movements & details retrieved.', { inventory });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch product inventory details.', 500, error.message);
  }
};
