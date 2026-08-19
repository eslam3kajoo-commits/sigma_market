import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Backend Complete Integration Test - Phases 1 to 4', () => {
  let adminToken: string;
  let merchantToken: string;
  let customerToken: string;
  let adminUser: any;
  let merchantUser: any;
  let customerUser: any;
  let testProduct: any;
  let testOrder: any;
  let generatedWarranty: any;

  async function cleanupScopedData() {
    await prisma.warrantyClaim.deleteMany({ where: { customer: { email: 'phase_customer@test.local' } } });
    await prisma.warranty.deleteMany({ where: { order: { customer: { email: 'phase_customer@test.local' } } } });
    await prisma.payment.deleteMany({ where: { order: { customer: { email: 'phase_customer@test.local' } } } });
    await prisma.delivery.deleteMany({ where: { order: { customer: { email: 'phase_customer@test.local' } } } });
    await prisma.orderItem.deleteMany({ where: { order: { customer: { email: 'phase_customer@test.local' } } } });
    await prisma.order.deleteMany({ where: { customer: { email: 'phase_customer@test.local' } } });
    await prisma.product.deleteMany({ where: { merchant: { email: 'phase_merchant@test.local' } } });
    await prisma.merchantProfile.deleteMany({ where: { user: { email: 'phase_merchant@test.local' } } });
    await prisma.user.deleteMany({
      where: { email: { in: ['phase_admin@test.local', 'phase_merchant@test.local', 'phase_customer@test.local'] } }
    });
  }

  beforeAll(async () => {
    await cleanupScopedData();

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
      create: { name: 'Customer', description: 'Customer role', permissions: JSON.stringify(['order:create']) }
    });

    const hash = await bcrypt.hash('SecurePass123!', 10);

    adminUser = await prisma.user.create({
      data: { email: 'phase_admin@test.local', fullName: 'Phase Admin', passwordHash: hash, roleId: adminRole.id }
    });

    merchantUser = await prisma.user.create({
      data: { email: 'phase_merchant@test.local', fullName: 'Phase Merchant', passwordHash: hash, roleId: merchantRole.id }
    });

    customerUser = await prisma.user.create({
      data: { email: 'phase_customer@test.local', fullName: 'Phase Customer', passwordHash: hash, roleId: customerRole.id }
    });

    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roleName: 'Admin', roleId: adminRole.id });
    merchantToken = generateToken({ userId: merchantUser.id, email: merchantUser.email, roleName: 'Merchant', roleId: merchantRole.id });
    customerToken = generateToken({ userId: customerUser.id, email: customerUser.email, roleName: 'Customer', roleId: customerRole.id });

    // Create merchant profile
    await prisma.merchantProfile.create({
      data: {
        userId: merchantUser.id,
        companyName: 'Supermarket Merchant Co',
        type: 'MERCHANT',
        status: 'PENDING',
        details: 'Registration pending admin approval'
      }
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        merchantId: merchantUser.id,
        name: 'Smart Refrigerator X1',
        description: 'Fresh food smart appliance',
        price: 999.99,
        barcode: `SMART-REF-${Date.now()}`,
        stock: 20
      }
    });

    // Create test order
    testOrder = await prisma.order.create({
      data: {
        customerId: customerUser.id,
        totalAmount: 999.99,
        status: 'PENDING',
        items: {
          create: {
            productId: testProduct.id,
            quantity: 1,
            unitPrice: 999.99
          }
        }
      }
    });
  });

  afterAll(async () => {
    await cleanupScopedData();
    await prisma.$disconnect();
  });

  // --- Part 2 Admin Tests ---
  it('1. GET /api/admin/pending-approvals returns pending merchant profiles', async () => {
    const res = await request(app)
      .get('/api/admin/pending-approvals')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.approvals.length).toBeGreaterThan(0);
  });

  it('2. POST & PATCH /api/admin/commissions sets platform commission rate', async () => {
    const res = await request(app)
      .post('/api/admin/commissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ commissionRate: 0.15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.setting.commissionRate).toBe(0.15);
  });

  it('3. GET /api/admin/audit-logs returns audit log entries', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  // --- Part 3 Warranty Core Tests ---
  it('4. POST /api/warranties/generate generates digital warranty card', async () => {
    const res = await request(app)
      .post('/api/warranties/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: testProduct.id,
        orderId: testOrder.id,
        durationMonths: 24
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.warranty.serialNumber).toBeDefined();
    generatedWarranty = res.body.data.warranty;
  });

  it('5. GET /api/warranties/lookup/:barcode searches warranty status by barcode/serial', async () => {
    const res = await request(app)
      .get(`/api/warranties/lookup/${testProduct.barcode}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.warranty.id).toBe(generatedWarranty.id);
  });

  it('6. POST /api/warranties/claims submits warranty claim', async () => {
    const res = await request(app)
      .post('/api/warranties/claims')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        warrantyId: generatedWarranty.id,
        issueDescription: 'Cooling sensor malfunctioning',
        claimType: 'REPAIR'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.claim.claimStatus).toBe('PENDING');
  });

  // --- Part 4 Financial & Delivery Tests ---
  it('7. POST /api/payments/mock-checkout calculates commission and confirms payment', async () => {
    const res = await request(app)
      .post('/api/payments/mock-checkout')
      .send({ orderId: testOrder.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.status).toBe('PAID');
    expect(res.body.data.financialSummary.platformCommission).toBeDefined();
  });

  it('8. GET /api/payouts/merchant/:id calculates net merchant payout', async () => {
    const res = await request(app)
      .get(`/api/payouts/merchant/${merchantUser.id}`)
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.financialSummary.totalSales).toBeGreaterThan(0);
  });

  it('9. POST /api/deliveries/assign assigns driver and updates shipment status', async () => {
    const res = await request(app)
      .post('/api/deliveries/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: testOrder.id,
        driverName: 'Sami Driver',
        driverPhone: '+966555123456',
        deliveryStatus: 'OUT_FOR_DELIVERY'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.delivery.deliveryStatus).toBe('OUT_FOR_DELIVERY');
  });
});
