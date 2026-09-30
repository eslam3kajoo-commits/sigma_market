import { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from '../../services/adminService';
import { userService } from '../../services/userService';
import { prisma } from '../../utils/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { auditLogger } from '../../utils/auditLogger';

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.string()
  })
});

export const commissionSchema = z.object({
  body: z.object({
    commissionRate: z.number().min(0).max(1)
  })
});

export const getSystemMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await adminService.getSystemMetrics();
    return sendSuccess(res, 'System telemetry metrics retrieved.', { metrics });
  } catch (error: any) {
    return sendError(res, 'Failed to retrieve system metrics.', 500, error.message);
  }
};

export const getAdminUsersList = async (req: Request, res: Response) => {
  try {
    const { role, status, search } = req.query;

    const where: any = {};
    if (role) {
      where.role = { name: String(role) };
    }
    if (status) {
      where.status = String(status);
    }
    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { fullName: { contains: String(search) } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        status: true,
        role: { select: { id: true, name: true, description: true } },
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Admin users list retrieved.', { users });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch admin users list.', 500, error.message);
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return sendError(res, 'Target user not found.', 404);
    }

    const updatedUser = await userService.updateUserStatus(id, status);

    // Also update merchant profile if exists
    await prisma.merchantProfile.updateMany({
      where: { userId: id },
      data: { status: status === 'ACTIVE' ? 'APPROVED' : status === 'SUSPENDED' ? 'REJECTED' : status }
    });

    // Audit Log critical administrative action
    await auditLogger.log('USER_STATUS_TOGGLE', req.user?.userId || 'SYSTEM', {
      targetUserId: id,
      newStatus: status
    }, req.ip);

    return sendSuccess(res, `User status updated to ${status}.`, { user: updatedUser });
  } catch (error: any) {
    return sendError(res, 'Failed to update user status.', 500, error.message);
  }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const pendingProfiles = await prisma.merchantProfile.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            status: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Pending merchant & charity approvals retrieved.', { approvals: pendingProfiles });
  } catch (error: any) {
    return sendError(res, 'Failed to retrieve pending approvals.', 500, error.message);
  }
};

export const setOrUpdateCommission = async (req: Request, res: Response) => {
  try {
    const { commissionRate } = req.body;

    const setting = await prisma.systemSetting.upsert({
      where: { settingKey: 'PLATFORM_COMMISSION' },
      update: { commissionRate },
      create: { settingKey: 'PLATFORM_COMMISSION', commissionRate }
    });

    await auditLogger.log('UPDATE_COMMISSION_RATE', req.user?.userId || 'SYSTEM', {
      commissionRate
    }, req.ip);

    return sendSuccess(res, 'Platform commission rate updated successfully.', { setting });
  } catch (error: any) {
    return sendError(res, 'Failed to update commission rate.', 500, error.message);
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return sendSuccess(res, 'Audit logs retrieved successfully.', { logs });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch audit logs.', 500, error.message);
  }
};

async function deleteSingleUser(userId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.address.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.merchantProfile.deleteMany({ where: { userId } });
    await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
    await tx.warrantyClaim.deleteMany({ where: { customerId: userId } });
    await tx.inventoryMovement.deleteMany({ where: { createdById: userId } });
    await tx.donation.deleteMany({ where: { charityId: userId } });

    const userOrders = await tx.order.findMany({ where: { customerId: userId }, select: { id: true } });
    const orderIds = userOrders.map(o => o.id);
    if (orderIds.length > 0) {
      await tx.warrantyClaim.deleteMany({ where: { warranty: { orderId: { in: orderIds } } } });
      await tx.warranty.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { customerId: userId } });
    }

    const merchantProds = await tx.product.findMany({ where: { merchantId: userId }, select: { id: true } });
    const prodIds = merchantProds.map(p => p.id);
    if (prodIds.length > 0) {
      await tx.warrantyClaim.deleteMany({ where: { warranty: { productId: { in: prodIds } } } });
      await tx.warranty.deleteMany({ where: { productId: { in: prodIds } } });
      await tx.orderItem.deleteMany({ where: { productId: { in: prodIds } } });
      await tx.inventoryMovement.deleteMany({ where: { productId: { in: prodIds } } });
      await tx.donation.deleteMany({ where: { productId: { in: prodIds } } });
      await tx.product.deleteMany({ where: { merchantId: userId } });
    }

    return await tx.user.delete({ where: { id: userId } });
  });
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user?.userId) {
      return sendError(res, 'لا يمكنك حذف حسابك الشخصي النشط حالياً.', 400);
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return sendError(res, 'المستخدم غير موجود.', 404);
    }

    await deleteSingleUser(id);

    await auditLogger.log('USER_DELETED', req.user?.userId || 'SYSTEM', {
      deletedUserId: id,
      email: targetUser.email
    }, req.ip);

    return sendSuccess(res, 'تم حذف حساب المستخدم بنجاح.');
  } catch (error: any) {
    console.error('[DELETE USER ERROR]:', error);
    return sendError(res, 'فشل حذف حساب المستخدم.', 500, error.message);
  }
};

export const clearTestAccounts = async (req: Request, res: Response) => {
  try {
    const currentAdminId = req.user?.userId;

    const testUsers = await prisma.user.findMany({
      where: {
        id: { not: currentAdminId },
        OR: [
          { email: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'verify', mode: 'insensitive' } },
          { email: { contains: 'demo', mode: 'insensitive' } },
          { email: { endsWith: '@example.com' } },
          { email: { endsWith: '@test.com' } },
          { fullName: { contains: 'test', mode: 'insensitive' } },
          { fullName: { contains: 'تجريبي' } },
          { fullName: { contains: 'اختبار' } }
        ]
      },
      select: { id: true }
    });

    const userIds = testUsers.map(u => u.id);
    if (userIds.length === 0) {
      return sendSuccess(res, 'لا يوجد حسابات تجريبية للحذف.', { deletedCount: 0 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.merchantProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.auditLog.updateMany({ where: { userId: { in: userIds } }, data: { userId: null } });
      await tx.warrantyClaim.deleteMany({ where: { customerId: { in: userIds } } });
      await tx.inventoryMovement.deleteMany({ where: { createdById: { in: userIds } } });
      await tx.donation.deleteMany({ where: { charityId: { in: userIds } } });

      const userOrders = await tx.order.findMany({ where: { customerId: { in: userIds } }, select: { id: true } });
      const orderIds = userOrders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.warrantyClaim.deleteMany({ where: { warranty: { orderId: { in: orderIds } } } });
        await tx.warranty.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { customerId: { in: userIds } } });
      }

      const merchantProds = await tx.product.findMany({ where: { merchantId: { in: userIds } }, select: { id: true } });
      const prodIds = merchantProds.map(p => p.id);
      if (prodIds.length > 0) {
        await tx.warrantyClaim.deleteMany({ where: { warranty: { productId: { in: prodIds } } } });
        await tx.warranty.deleteMany({ where: { productId: { in: prodIds } } });
        await tx.orderItem.deleteMany({ where: { productId: { in: prodIds } } });
        await tx.inventoryMovement.deleteMany({ where: { productId: { in: prodIds } } });
        await tx.donation.deleteMany({ where: { productId: { in: prodIds } } });
        await tx.product.deleteMany({ where: { merchantId: { in: userIds } } });
      }

      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });

    const deletedCount = userIds.length;

    await auditLogger.log('CLEAR_TEST_ACCOUNTS', currentAdminId || 'SYSTEM', {
      deletedCount
    }, req.ip);

    return sendSuccess(res, `تم حذف ${deletedCount} حساب تجريبي بنجاح.`, { deletedCount });
  } catch (error: any) {
    return sendError(res, 'فشل تنظيف الحسابات التجريبية.', 500, error.message);
  }
};
