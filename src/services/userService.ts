import { prisma } from '../utils/prisma';

export const userService = {
  async getUserById(id: string) {
    return prisma.user.findUnique({
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
        createdAt: true,
        updatedAt: true
      }
    });
  },

  async updateUserProfile(id: string, data: { fullName?: string; phoneNumber?: string }) {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {})
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
  },

  async updateUserStatus(id: string, status: string) {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true
      }
    });
  }
};
