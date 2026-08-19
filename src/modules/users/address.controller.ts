import { Request, Response } from 'express';
import { z } from 'zod';
import { addressService } from '../../services/addressService';
import { sendSuccess, sendError } from '../../utils/response';

export const createAddressSchema = z.object({
  body: z.object({
    street: z.string().min(3, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().min(3, 'Postal code is required'),
    country: z.string().optional().default('Saudi Arabia'),
    isDefault: z.boolean().optional().default(false)
  })
});

export const updateAddressSchema = z.object({
  body: z.object({
    street: z.string().min(3).optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    postalCode: z.string().min(3).optional(),
    country: z.string().optional(),
    isDefault: z.boolean().optional()
  })
});

export const getUserAddresses = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const addresses = await addressService.getUserAddresses(req.user.userId);
    return sendSuccess(res, 'Addresses fetched successfully.', { addresses });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch addresses.', 500, error.message);
  }
};

export const addAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const address = await addressService.createAddress({
      userId: req.user.userId,
      ...req.body
    });

    return sendSuccess(res, 'Address added successfully.', { address }, 201);
  } catch (error: any) {
    return sendError(res, 'Failed to add address.', 500, error.message);
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { id } = req.params;
    const existing = await addressService.getAddressById(id);

    if (!existing) {
      return sendError(res, 'Address not found.', 404);
    }

    // Ownership check: User can only modify their own addresses (unless Admin)
    if (req.user.roleName !== 'Admin' && existing.userId !== req.user.userId) {
      return sendError(res, 'Access forbidden. You can only edit your own addresses.', 403);
    }

    const updated = await addressService.updateAddress(id, req.user.userId, req.body);
    return sendSuccess(res, 'Address updated successfully.', { address: updated });
  } catch (error: any) {
    return sendError(res, 'Failed to update address.', 500, error.message);
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { id } = req.params;
    const existing = await addressService.getAddressById(id);

    if (!existing) {
      return sendError(res, 'Address not found.', 404);
    }

    if (req.user.roleName !== 'Admin' && existing.userId !== req.user.userId) {
      return sendError(res, 'Access forbidden. You can only delete your own addresses.', 403);
    }

    await addressService.deleteAddress(id);
    return sendSuccess(res, 'Address deleted successfully.');
  } catch (error: any) {
    return sendError(res, 'Failed to delete address.', 500, error.message);
  }
};

export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }

    const { id } = req.params;
    const existing = await addressService.getAddressById(id);

    if (!existing) {
      return sendError(res, 'Address not found.', 404);
    }

    if (req.user.roleName !== 'Admin' && existing.userId !== req.user.userId) {
      return sendError(res, 'Access forbidden. You can only modify your own addresses.', 403);
    }

    const updated = await addressService.setDefaultAddress(id, req.user.userId);
    return sendSuccess(res, 'Default address updated successfully.', { address: updated });
  } catch (error: any) {
    return sendError(res, 'Failed to set default address.', 500, error.message);
  }
};
