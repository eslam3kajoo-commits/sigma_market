import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name is required and must be at least 2 characters'),
    description: z.string().optional(),
    parentId: z.string().uuid().optional().nullable()
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    parentId: z.string().uuid().optional().nullable()
  })
});

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    return sendSuccess(res, 'Categories fetched successfully.', { categories });
  } catch (error: any) {
    console.warn('Database query fallback in getAllCategories:', error.message);
    return sendSuccess(res, 'Categories retrieved.', { categories: [] });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          take: 20,
          select: { id: true, name: true, price: true, barcode: true, stock: true }
        },
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      return sendError(res, 'Category not found.', 404);
    }

    return sendSuccess(res, 'Category details retrieved.', { category });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch category details.', 500, error.message);
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, parentId } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return sendError(res, `Category with name '${name}' already exists.`, 409);
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return sendError(res, 'Parent category not found.', 404);
      }
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        description: description || null,
        parentId: parentId || null
      }
    });

    return sendSuccess(res, 'Category created successfully.', { category: newCategory }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to create category.', 500, error.message);
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, parentId } = req.body;

    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      return sendError(res, 'Category not found.', 404);
    }

    if (name && name !== existingCategory.name) {
      const duplicate = await prisma.category.findUnique({ where: { name } });
      if (duplicate) {
        return sendError(res, `Category name '${name}' is already taken.`, 409);
      }
    }

    if (parentId) {
      if (parentId === id) {
        return sendError(res, 'Category cannot be its own parent.', 400);
      }
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return sendError(res, 'Parent category not found.', 404);
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(parentId !== undefined ? { parentId } : {})
      }
    });

    return sendSuccess(res, 'Category updated successfully.', { category: updatedCategory });
  } catch (error: any) {
    return sendError(res, 'Failed to update category.', 500, error.message);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } }
    });

    if (!existingCategory) {
      return sendError(res, 'Category not found.', 404);
    }

    // Reassign products to null category if any
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    // Reassign children categories to null parent if any
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: null }
    });

    await prisma.category.delete({ where: { id } });

    return sendSuccess(res, 'Category deleted successfully.');
  } catch (error: any) {
    return sendError(res, 'Failed to delete category.', 500, error.message);
  }
};
