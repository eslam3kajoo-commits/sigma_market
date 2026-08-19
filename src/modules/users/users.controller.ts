import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phoneNumber: z.string().optional()
  })
});

export const changeRoleSchema = z.object({
  body: z.object({
    roleName: z.enum(['Customer', 'Merchant', 'Charity', 'Admin'])
  })
});

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        status: true,
        role: {
          select: { id: true, name: true, description: true }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Users list retrieved successfully.', { users });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch users list.', 500, error.message);
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        status: true,
        role: {
          select: { id: true, name: true, description: true }
        },
        addresses: true,
        createdAt: true
      }
    });

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, 'User profile retrieved successfully.', { user });
  } catch (error: any) {
    return sendError(res, 'Failed to retrieve user profile.', 500, error.message);
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber } : {})
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        status: true,
        updatedAt: true
      }
    });

    return sendSuccess(res, 'User profile updated successfully.', { user: updatedUser });
  } catch (error: any) {
    return sendError(res, 'Failed to update user profile.', 500, error.message);
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;

    const targetRole = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!targetRole) {
      return sendError(res, `Target role '${roleName}' not found.`, 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: targetRole.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: { select: { id: true, name: true } }
      }
    });

    return sendSuccess(res, `User role successfully updated to ${roleName}.`, { user: updatedUser });
  } catch (error: any) {
    return sendError(res, 'Failed to update user role.', 500, error.message);
  }
};
