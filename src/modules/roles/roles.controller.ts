import { Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';

export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        _count: {
          select: { users: true }
        }
      }
    });

    const formattedRoles = roles.map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions || '[]')
    }));

    return sendSuccess(res, 'Roles fetched successfully.', { roles: formattedRoles });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch system roles.', 500, error.message);
  }
};
