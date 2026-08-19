import { prisma } from '../utils/prisma';

export const adminService = {
  async getSystemMetrics() {
    const [
      totalUsers,
      totalMerchants,
      totalCustomers,
      totalCharities,
      totalProducts,
      totalOrders,
      totalDonations
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { name: 'Merchant' } } }),
      prisma.user.count({ where: { role: { name: 'Customer' } } }),
      prisma.user.count({ where: { role: { name: 'Charity' } } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.donation.count()
    ]);

    return {
      totalUsers,
      totalMerchants,
      totalCustomers,
      totalCharities,
      totalProducts,
      totalOrders,
      totalDonations,
      timestamp: new Date().toISOString()
    };
  }
};
