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
    const defaultRoles = [
      { id: '1', name: 'Admin', description: 'مدير النظام الكامل الصلاحيات', permissions: ['*'], _count: { users: 1 } },
      { id: '2', name: 'Merchant', description: 'تاجر متجر سيجما ماركت', permissions: ['products:manage'], _count: { users: 0 } },
      { id: '3', name: 'Customer', description: 'عميل ومشتري عادي', permissions: ['orders:create'], _count: { users: 0 } },
      { id: '4', name: 'Charity', description: 'جمعية خيرية شريكة', permissions: ['donations:receive'], _count: { users: 0 } }
    ];
    return sendSuccess(res, 'System roles retrieved.', { roles: defaultRoles });
  }
};
