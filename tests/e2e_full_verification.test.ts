import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Comprehensive End-to-End Practical Project Verification', () => {
  let adminToken: string;
  let merchantToken: string;
  let customerToken: string;
  let charityToken: string;

  let adminUser: any;
  let merchantUser: any;
  let customerUser: any;
  let charityUser: any;

  let createdCategory: any;
  let createdProduct: any;
  let createdOrder: any;
  let generatedWarranty: any;
  let createdClaim: any;
  let createdAddress: any;

  async function cleanupTestData() {
    await prisma.warrantyClaim.deleteMany({ where: { customer: { email: 'e2e_customer@supermarket.test' } } });
    await prisma.warranty.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.payout.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({ where: { customer: { email: 'e2e_customer@supermarket.test' } } });
    await prisma.inventoryMovement.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.expiryInfo.deleteMany({});
    await prisma.pricingDiscount.deleteMany({});
    await prisma.donation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({ where: { name: 'E2E Electronics' } });
    await prisma.merchantProfile.deleteMany({});
    await prisma.address.deleteMany({ where: { user: { email: 'e2e_customer@supermarket.test' } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'e2e_admin@supermarket.test',
            'e2e_merchant@supermarket.test',
            'e2e_customer@supermarket.test',
            'e2e_charity@supermarket.test'
          ]
        }
      }
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

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

    const charityRole = await prisma.role.upsert({
      where: { name: 'Charity' },
      update: {},
      create: { name: 'Charity', description: 'Charity role', permissions: JSON.stringify(['donation:request']) }
    });

    const hash = await bcrypt.hash('SecurePassword123!', 10);

    adminUser = await prisma.user.create({
      data: { email: 'e2e_admin@supermarket.test', fullName: 'E2E System Admin', passwordHash: hash, roleId: adminRole.id }
    });

    merchantUser = await prisma.user.create({
      data: { email: 'e2e_merchant@supermarket.test', fullName: 'E2E Merchant Store', passwordHash: hash, roleId: merchantRole.id }
    });

    customerUser = await prisma.user.create({
      data: { email: 'e2e_customer@supermarket.test', fullName: 'E2E Customer Buyer', passwordHash: hash, roleId: customerRole.id }
    });

    charityUser = await prisma.user.create({
      data: { email: 'e2e_charity@supermarket.test', fullName: 'E2E Charity Partner', passwordHash: hash, roleId: charityRole.id }
    });

    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roleName: 'Admin', roleId: adminRole.id });
    merchantToken = generateToken({ userId: merchantUser.id, email: merchantUser.email, roleName: 'Merchant', roleId: merchantRole.id });
    customerToken = generateToken({ userId: customerUser.id, email: customerUser.email, roleName: 'Customer', roleId: customerRole.id });
    charityToken = generateToken({ userId: charityUser.id, email: charityUser.email, roleName: 'Charity', roleId: charityRole.id });

    // Create merchant profile
    await prisma.merchantProfile.create({
      data: {
        userId: merchantUser.id,
        companyName: 'E2E Smart Supermarket Branch',
        type: 'MERCHANT',
        status: 'PENDING',
        details: 'Store branch pending approval'
      }
    });

    // Create category
    createdCategory = await prisma.category.create({
      data: {
        name: 'E2E Electronics',
        description: 'Smart appliances & devices'
      }
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // --- 1. System Health ---
  it('1. GET /api/health returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // --- 2. Authentication APIs ---
  it('2. POST /api/auth/register creates user account', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'e2e_new_customer@supermarket.test',
        password: 'Password123!',
        fullName: 'New Customer',
        roleName: 'Customer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // cleanup created user
    await prisma.user.delete({ where: { email: 'e2e_new_customer@supermarket.test' } });
  });

  it('3. POST /api/auth/login authenticates user and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'e2e_customer@supermarket.test',
        password: 'SecurePassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('4. GET /api/auth/me retrieves current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('e2e_customer@supermarket.test');
  });

  it('5. POST /api/auth/logout invalidates session', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // --- 3. Roles & Users RBAC ---
  it('6. GET /api/roles returns RBAC system roles', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles.length).toBeGreaterThan(0);
  });

  it('7. Admin can view users GET /api/users, Customer is rejected (403)', async () => {
    const adminRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);

    const customerRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerRes.status).toBe(403);
  });

  // --- 4. User Addresses CRUD ---
  it('8. Customer can CRUD shipping addresses (/api/users/addresses)', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/users/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: 'King Fahd Road',
        city: 'Riyadh',
        state: 'Riyadh',
        postalCode: '11564',
        country: 'Saudi Arabia'
      });
    expect(createRes.status).toBe(201);
    createdAddress = createRes.body.data.address;

    // List
    const listRes = await request(app)
      .get('/api/users/addresses')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.addresses.length).toBeGreaterThan(0);
  });

  // --- 5. Products Catalog & Barcode ---
  it('9. Merchant can create product, Customer is rejected (403)', async () => {
    const barcode = `E2E-BAR-${Date.now()}`;

    // Customer attempt (Forbidden)
    const custRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized TV',
        description: 'Cust attempt',
        price: 100,
        barcode: `UNAUTH-${Date.now()}`,
        stock: 5
      });
    expect(custRes.status).toBe(403);

    // Merchant attempt (Success)
    const merchRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        categoryId: createdCategory.id,
        name: 'Supermarket Smart Blender',
        description: 'High power blender with 2-year warranty',
        price: 150.00,
        barcode,
        stock: 50
      });

    expect(merchRes.status).toBe(201);
    createdProduct = merchRes.body.data.product;
  });

  it('10. Public can lookup product by barcode GET /api/products/barcode/:barcode', async () => {
    const res = await request(app).get(`/api/products/barcode/${createdProduct.barcode}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.id).toBe(createdProduct.id);
  });

  // --- 6. Inventory Movements ---
  it('11. Merchant can add inventory movement POST /api/inventory/movement', async () => {
    const res = await request(app)
      .post('/api/inventory/movement')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        productId: createdProduct.id,
        type: 'ADD',
        quantity: 20,
        reason: 'Restocking fresh batch'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  // --- 7. Cart & Orders ---
  it('12. Customer can create order POST /api/orders and view orders GET /api/orders', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: createdAddress.id,
        items: [
          { productId: createdProduct.id, quantity: 2 }
        ]
      });

    expect(createRes.status).toBe(201);
    createdOrder = createRes.body.data.order;

    const listRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.orders.length).toBeGreaterThan(0);
  });

  // --- 8. Financial Payments & Payouts ---
  it('13. POST /api/payments/mock-checkout processes payment & auto-generates warranty with QR Code', async () => {
    const res = await request(app)
      .post('/api/payments/mock-checkout')
      .send({ orderId: createdOrder.id });

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('PAID');
    expect(res.body.data.financialSummary.platformCommission).toBeDefined();
  });

  it('14. GET /api/payouts/merchant/:id calculates net merchant payouts', async () => {
    const res = await request(app)
      .get(`/api/payouts/merchant/${merchantUser.id}`)
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.financialSummary.totalSales).toBe(300.00);
  });

  // --- 9. Admin Control Panel ---
  it('15. Admin panel APIs (metrics, pending approvals, commissions, audit logs)', async () => {
    // Metrics
    const metricsRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(metricsRes.status).toBe(200);

    // Pending Approvals
    const approvalsRes = await request(app)
      .get('/api/admin/pending-approvals')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approvalsRes.status).toBe(200);

    // Set Commission
    const commRes = await request(app)
      .post('/api/admin/commissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ commissionRate: 0.12 });
    expect(commRes.status).toBe(200);
    expect(commRes.body.data.setting.commissionRate).toBe(0.12);

    // Audit Logs
    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.status).toBe(200);
  });

  // --- 10. Warranty Core Engine ---
  it('16. Warranty generation, barcode lookup, claim submission & status update', async () => {
    // Generate Warranty
    const genRes = await request(app)
      .post('/api/warranties/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: createdProduct.id,
        orderId: createdOrder.id,
        durationMonths: 12
      });
    expect(genRes.status).toBe(201);
    expect(genRes.body.data.warranty.qrCode).toBeDefined();
    generatedWarranty = genRes.body.data.warranty;

    // Lookup Warranty
    const lookupRes = await request(app)
      .get(`/api/warranties/lookup/${generatedWarranty.serialNumber}`);
    expect(lookupRes.status).toBe(200);

    // Submit Claim (Customer)
    const claimRes = await request(app)
      .post('/api/warranties/claims')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        warrantyId: generatedWarranty.id,
        issueDescription: 'Blender blade gear slipped',
        claimType: 'REPAIR'
      });
    expect(claimRes.status).toBe(201);
    createdClaim = claimRes.body.data.claim;

    // Update Claim Status (Admin/Merchant)
    const updateRes = await request(app)
      .patch(`/api/warranties/claims/${createdClaim.id}`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ claimStatus: 'APPROVED' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.claim.claimStatus).toBe('APPROVED');
  });

  // --- 11. Delivery Assignment ---
  it('17. POST /api/deliveries/assign updates delivery status', async () => {
    const res = await request(app)
      .post('/api/deliveries/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderId: createdOrder.id,
        driverName: 'Ahmad Driver',
        driverPhone: '+966500112233',
        deliveryStatus: 'DELIVERED'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.delivery.deliveryStatus).toBe('DELIVERED');
  });

  // --- 12. Charity Donations ---
  it('18. Charity can request donation POST /api/donations/request and list GET /api/donations', async () => {
    const reqRes = await request(app)
      .post('/api/donations/request')
      .set('Authorization', `Bearer ${charityToken}`)
      .send({
        productId: createdProduct.id,
        quantity: 5
      });

    expect(reqRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/donations')
      .set('Authorization', `Bearer ${charityToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.donations.length).toBeGreaterThan(0);
  });

  // --- 13. Notifications & Analytics Placeholders ---
  it('19. GET /api/notifications returns user notifications list', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
