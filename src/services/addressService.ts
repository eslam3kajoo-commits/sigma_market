import { prisma } from '../utils/prisma';

export interface CreateAddressDTO {
  userId: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export const addressService = {
  async getUserAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' }
    });
  },

  async getAddressById(id: string) {
    return prisma.address.findUnique({
      where: { id }
    });
  },

  async createAddress(dto: CreateAddressDTO) {
    // If setting as default, unmark other addresses for this user
    if (dto.isDefault) {
      await prisma.address.updateMany({
        where: { userId: dto.userId },
        data: { isDefault: false }
      });
    }

    // Check if user has no addresses yet; make first address default automatically
    const existingCount = await prisma.address.count({ where: { userId: dto.userId } });
    const isDefault = existingCount === 0 ? true : Boolean(dto.isDefault);

    return prisma.address.create({
      data: {
        userId: dto.userId,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'Saudi Arabia',
        isDefault
      }
    });
  },

  async updateAddress(id: string, userId: string, data: Partial<CreateAddressDTO>) {
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    return prisma.address.update({
      where: { id },
      data: {
        ...(data.street ? { street: data.street } : {}),
        ...(data.city ? { city: data.city } : {}),
        ...(data.state ? { state: data.state } : {}),
        ...(data.postalCode ? { postalCode: data.postalCode } : {}),
        ...(data.country ? { country: data.country } : {}),
        ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {})
      }
    });
  },

  async deleteAddress(id: string) {
    return prisma.address.delete({ where: { id } });
  },

  async setDefaultAddress(id: string, userId: string) {
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    return prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });
  }
};
