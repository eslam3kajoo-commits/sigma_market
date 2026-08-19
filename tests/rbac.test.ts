import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Smart Warranty Platform - Roles & Permissions RBAC Suite', () => {
  let adminToken: string;
  let merchant1Token: string;
  let merchant2Token: string;
  let customerToken: string;

  let merchant1User: any;
  let merchant2User: any;
  let customerUser: any;

  beforeAll(async () => {
    // Cleanup any lingering test users from prior runs
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'rbacadmin@smartwarranty.local',
            'merchant1@smartwarranty.local',
            'merchant2@smartwarranty.local',
            'customer1@smartwarranty.local'
          ]
        }
      }
    });

    // Seed system roles
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', description: 'Admin role', permissions: JSON.stringify(['*']) }
    });

    const merchantRole = await prisma.role.upsert({
      where: { name: 'Merchant' },
      update: {},
      create: { name: 'Merchant', description: 'Merchant role', permissions: JSON.stringify(['product:create']) }
    });

    const customerRole = await prisma.role.upsert({
      where: { name: 'Customer' },
      update: {},
      create: { name: 'Customer', description: 'Customer role', permissions: JSON.stringify(['profile:read']) }
    });

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Create Test Users
    const adminUser = await prisma.user.create({
      data: { email: 'rbacadmin@smartwarranty.local', fullName: 'RBAC Admin', passwordHash, roleId: adminRole.id }
    });

    merchant1User = await prisma.user.create({
      data: { email: 'merchant1@smartwarranty.local', fullName: 'Merchant One', passwordHash, roleId: merchantRole.id }
    });

    merchant2User = await prisma.user.create({
      data: { email: 'merchant2@smartwarranty.local', fullName: 'Merchant Two', passwordHash, roleId: merchantRole.id }
    });

    customerUser = await prisma.user.create({
      data: { email: 'customer1@smartwarranty.local', fullName: 'Customer One', passwordHash, roleId: customerRole.id }
    });

    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roleName: 'Admin', roleId: adminRole.id });
    merchant1Token = generateToken({ userId: merchant1User.id, email: merchant1User.email, roleName: 'Merchant', roleId: merchantRole.id });
    merchant2Token = generateToken({ userId: merchant2User.id, email: merchant2User.email, roleName: 'Merchant', roleId: merchantRole.id });
    customerToken = generateToken({ userId: customerUser.id, email: customerUser.email, roleName: 'Customer', roleId: customerRole.id });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: {
        merchant: {
          email: {
            in: [
              'rbacadmin@smartwarranty.local',
              'merchant1@smartwarranty.local',
              'merchant2@smartwarranty.local',
              'customer1@smartwarranty.local'
            ]
          }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'rbacadmin@smartwarranty.local',
            'merchant1@smartwarranty.local',
            'merchant2@smartwarranty.local',
            'customer1@smartwarranty.local'
          ]
        }
      }
    });
    await prisma.$disconnect();
  });

  it('1. Admin can access admin-protected route GET /api/users (200 OK)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
  });

  it('2. Customer is rejected from admin route GET /api/users (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Merchant can create product POST /api/products (201 Created)', async () => {
    const productData = {
      name: 'Smart Warranty OLED TV',
      description: 'Ultra HD 4K Smart TV with 3-year digital warranty',
      price: 2999.99,
      barcode: 'SW-OLED-4K-001',
      stock: 25
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${merchant1Token}`)
      .send(productData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.merchantId).toBe(merchant1User.id);
  });

  it('4. Customer is rejected from creating product POST /api/products (403 Forbidden)', async () => {
    const productData = {
      name: 'Unauthorized Product',
      description: 'Customer attempt to bypass RBAC',
      price: 10.00,
      barcode: 'SW-UNAUTH-001',
      stock: 1
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(productData);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('5. Merchant B cannot update Merchant A product (Cross-tenant security 403 Forbidden)', async () => {
    // Create product owned by Merchant A
    const productA = await prisma.product.create({
      data: {
        merchantId: merchant1User.id,
        name: 'Merchant A Special Item',
        description: 'Store A exclusive warranty item',
        price: 500,
        barcode: 'MERCHANT-A-BARCODE-001',
        stock: 10
      }
    });

    // Merchant B tries to modify Merchant A's product
    const res = await request(app)
      .put(`/api/products/${productA.id}`)
      .set('Authorization', `Bearer ${merchant2Token}`)
      .send({ name: 'Hacked Product Name' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
