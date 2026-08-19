import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
    roleName: z.enum(['Customer', 'Merchant', 'Charity', 'Admin']).optional().default('Customer'),
    phoneNumber: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(1, 'Password is required')
  })
});

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, roleName, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return sendError(res, 'User with this email already exists.', 409);
    }

    // Resolve target role
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      return sendError(res, `Specified role '${roleName}' does not exist.`, 400);
    }

    // Hash password securely
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber || null,
        roleId: role.id,
        status: 'ACTIVE'
      },
      include: {
        role: true
      }
    });

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      roleName: newUser.role.name,
      roleId: newUser.role.id
    });

    // Set HTTP-only cookie for secure browser clients
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, 'User account registered successfully.', {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role.name,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    }, 201);
  } catch (error: any) {
    return sendError(res, 'An error occurred during registration.', 500, error.message);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true }
    });

    if (!user) {
      return sendError(res, 'Invalid credentials. Please check email and password.', 401);
    }

    if (user.status !== 'ACTIVE') {
      return sendError(res, 'Account is inactive or suspended. Please contact support.', 403);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid credentials. Please check email and password.', 401);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      roleName: user.role.name,
      roleId: user.role.id
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, 'Login successful.', {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        status: user.status
      }
    });
  } catch (error: any) {
    return sendError(res, 'An error occurred during login.', 500, error.message);
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  res.clearCookie('token');
  return sendSuccess(res, 'Logout successful.');
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        role: true,
        addresses: true
      }
    });

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, 'Current user profile fetched successfully.', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role.name,
        roleDescription: user.role.description,
        permissions: JSON.parse(user.role.permissions || '[]'),
        status: user.status,
        addresses: user.addresses,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    return sendError(res, 'Failed to fetch user profile.', 500, error.message);
  }
};
