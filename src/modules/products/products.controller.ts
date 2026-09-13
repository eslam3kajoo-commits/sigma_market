import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name is required'),
    description: z.string().optional().default(''),
    price: z.number().positive('Price must be greater than 0'),
    barcode: z.string().min(3, 'Barcode is required'),
    stock: z.number().int().nonnegative().default(0),
    categoryId: z.string().optional(),
    expiryDate: z.string().optional(), // ISO date string
    alertDaysBefore: z.number().int().optional().default(30)
  })
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    barcode: z.string().min(3).optional(),
    stock: z.number().int().nonnegative().optional(),
    status: z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED']).optional(),
    categoryId: z.string().optional(),
    expiryDate: z.string().optional()
  })
});

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { categoryId, search, barcode } = req.query;

    const whereClause: any = {};
    if (categoryId) {
      whereClause.categoryId = String(categoryId);
    }
    if (barcode) {
      whereClause.barcode = String(barcode);
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { description: { contains: String(search) } },
        { barcode: { contains: String(search) } }
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        merchant: {
          select: { id: true, fullName: true, email: true }
        },
        inventory: true,
        expiryInfo: true,
        pricingDiscounts: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Products fetched successfully.', { products });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch products.', 500, error.message);
  }
};

export const getProductByBarcode = async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        merchant: { select: { id: true, fullName: true, email: true } },
        inventory: true,
        expiryInfo: true,
        pricingDiscounts: { where: { isActive: true } }
      }
    });

    if (!product) {
      return sendError(res, `No product registered with barcode '${barcode}'.`, 404);
    }

    return sendSuccess(res, 'Product warranty & details retrieved.', { product });
  } catch (error: any) {
    return sendError(res, 'Failed to lookup product by barcode.', 500, error.message);
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        merchant: { select: { id: true, fullName: true, email: true } },
        inventory: true,
        expiryInfo: true,
        pricingDiscounts: { where: { isActive: true } }
      }
    });

    if (!product) {
      return sendError(res, 'Product not found.', 404);
    }

    return sendSuccess(res, 'Product details retrieved.', { product });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch product details.', 500, error.message);
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { name, description, price, barcode, stock, categoryId, expiryDate, alertDaysBefore } = req.body;
    const merchantId = req.user.userId;

    // Check barcode uniqueness
    const existingProduct = await prisma.product.findUnique({
      where: { barcode }
    });

    if (existingProduct) {
      return sendError(res, `Product with barcode '${barcode}' already exists.`, 409);
    }

    // Ensure product is linked to a valid category (no products without Category)
    let targetCategoryId = categoryId;
    if (targetCategoryId) {
      const catExists = await prisma.category.findUnique({ where: { id: targetCategoryId } });
      if (!catExists) {
        return sendError(res, 'Specified category does not exist.', 404);
      }
    } else {
      let defaultCat = await prisma.category.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!defaultCat) {
        defaultCat = await prisma.category.create({
          data: {
            name: 'عام',
            description: 'قسم المنتجات العامة والافتراضية'
          }
        });
      }
      targetCategoryId = defaultCat.id;
    }

    // Create product with relational Inventory and ExpiryInfo in single transaction
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : undefined;

    const newProduct = await prisma.product.create({
      data: {
        merchantId,
        categoryId: targetCategoryId,
        name,
        description: description || name || 'منتج سيجما ماركت',
        price,
        barcode,
        stock,
        status: stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        expiryDate: parsedExpiryDate,
        inventory: {
          create: {
            merchantId,
            quantity: stock,
            minStockLevel: 5
          }
        },
        ...(parsedExpiryDate ? {
          expiryInfo: {
            create: {
              expiryDate: parsedExpiryDate,
              alertDaysBefore: alertDaysBefore || 30,
              isExpired: parsedExpiryDate < new Date()
            }
          }
        } : {})
      },
      include: {
        inventory: true,
        expiryInfo: true,
        category: true
      }
    });

    return sendSuccess(res, 'Product created successfully with inventory tracking.', { product: newProduct }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to create product.', 500, error.message);
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, barcode, stock, status, categoryId, expiryDate } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { inventory: true }
    });

    if (!existingProduct) {
      return sendError(res, 'Product not found.', 404);
    }

    // Cross-tenant merchant security check: Merchant can only update their own products
    if (req.user?.roleName === 'Merchant' && existingProduct.merchantId !== req.user.userId) {
      return sendError(res, 'Forbidden. You can only edit your own store products.', 403);
    }

    // Check barcode uniqueness if barcode is changed
    if (barcode && barcode !== existingProduct.barcode) {
      const duplicateBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (duplicateBarcode) {
        return sendError(res, `Product with barcode '${barcode}' already exists.`, 409);
      }
    }

    // Prevent negative stock
    if (stock !== undefined && stock < 0) {
      return sendError(res, 'Stock quantity cannot be negative.', 400);
    }

    // Verify category if provided
    if (categoryId) {
      const catExists = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!catExists) {
        return sendError(res, 'Specified category does not exist.', 404);
      }
    }

    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : undefined;

    let updatedStatus = status;
    if (!updatedStatus && stock !== undefined) {
      updatedStatus = stock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK';
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(price ? { price } : {}),
        ...(barcode ? { barcode } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(updatedStatus ? { status: updatedStatus } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(parsedExpiryDate ? { expiryDate: parsedExpiryDate } : {})
      },
      include: {
        inventory: true,
        expiryInfo: true,
        category: true
      }
    });

    // Update inventory record if stock altered
    if (stock !== undefined && updatedProduct.inventory) {
      await prisma.inventory.update({
        where: { id: updatedProduct.inventory.id },
        data: { quantity: stock }
      });
    }

    return sendSuccess(res, 'Product updated successfully.', { product: updatedProduct });
  } catch (error: any) {
    return sendError(res, 'Failed to update product.', 500, error.message);
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return sendError(res, 'Product not found.', 404);
    }

    if (req.user?.roleName === 'Merchant' && existingProduct.merchantId !== req.user.userId) {
      return sendError(res, 'Forbidden. You can only delete your own store products.', 403);
    }

    await prisma.product.delete({ where: { id } });
    return sendSuccess(res, 'Product deleted successfully.');
  } catch (error: any) {
    return sendError(res, 'Failed to delete product.', 500, error.message);
  }
};
