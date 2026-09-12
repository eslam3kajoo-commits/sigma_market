import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Module: Products & Inventory Comprehensive Verification Test Suite', () => {
  let adminToken: string;
  let merchantToken: string;
  let merchant2Token: string;
  let customerToken: string;

  let adminUser: any;
  let merchantUser: any;
  let merchantUser2: any;
  let customerUser: any;

  let testCategory: any;
  let testProduct: any;

  async function cleanupData() {
    await prisma.inventoryMovement.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.expiryInfo.deleteMany({});
    await prisma.pricingDiscount.deleteMany({});
    await prisma.product.deleteMany({ where: { merchant: { email: { in: ['mod_merchant@test.local', 'mod_merchant2@test.local'] } } } });
    await prisma.category.deleteMany({ where: { name: { in: ['Dairy & Fresh', 'Electronics Unit Test'] } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['mod_admin@test.local', 'mod_merchant@test.local', 'mod_merchant2@test.local', 'mod_customer@test.local']
        }
      }
    });
  }

  beforeAll(async () => {
    await cleanupData();

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

    const hash = await bcrypt.hash('ModulePass123!', 10);

    adminUser = await prisma.user.create({
      data: { email: 'mod_admin@test.local', fullName: 'Module Admin', passwordHash: hash, roleId: adminRole.id }
    });

    merchantUser = await prisma.user.create({
      data: { email: 'mod_merchant@test.local', fullName: 'Module Merchant', passwordHash: hash, roleId: merchantRole.id }
    });

    merchantUser2 = await prisma.user.create({
      data: { email: 'mod_merchant2@test.local', fullName: 'Module Merchant 2', passwordHash: hash, roleId: merchantRole.id }
    });

    customerUser = await prisma.user.create({
      data: { email: 'mod_customer@test.local', fullName: 'Module Customer', passwordHash: hash, roleId: customerRole.id }
    });

    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roleName: 'Admin', roleId: adminRole.id });
    merchantToken = generateToken({ userId: merchantUser.id, email: merchantUser.email, roleName: 'Merchant', roleId: merchantRole.id });
    merchant2Token = generateToken({ userId: merchantUser2.id, email: merchantUser2.email, roleName: 'Merchant', roleId: merchantRole.id });
    customerToken = generateToken({ userId: customerUser.id, email: customerUser.email, roleName: 'Customer', roleId: customerRole.id });
  });

  afterAll(async () => {
    await cleanupData();
    await prisma.$disconnect();
  });

  // --- 1. Category System Tests ---
  describe('Categories System (/api/categories)', () => {
    it('Should allow Admin/Merchant to create category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          name: 'Dairy & Fresh',
          description: 'Fresh dairy and milk products'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Dairy & Fresh');
      testCategory = res.body.data.category;
    });

    it('Should reject Customer from creating category (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Unauthorized Cat' });

      expect(res.status).toBe(403);
    });

    it('Should list all categories with product counts', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThan(0);
    });

    it('Should update existing category', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated dairy description' });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toBe('Updated dairy description');
    });
  });

  // --- 2. Products System & Barcode Tests ---
  describe('Products System & Barcode (/api/products)', () => {
    const testBarcode = `BARCODE-TEST-${Date.now()}`;

    it('Should create product linked to category', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          categoryId: testCategory.id,
          name: 'Fresh Whole Milk 1L',
          description: 'Organic whole pasteurized milk',
          price: 4.99,
          barcode: testBarcode,
          stock: 30
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.barcode).toBe(testBarcode);
      expect(res.body.data.product.categoryId).toBe(testCategory.id);
      expect(res.body.data.product.inventory).toBeDefined();
      testProduct = res.body.data.product;
    });

    it('Should reject duplicate barcode on product creation (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          categoryId: testCategory.id,
          name: 'Duplicate Milk',
          description: 'Same barcode attempt',
          price: 5.00,
          barcode: testBarcode,
          stock: 10
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Should lookup product by barcode', async () => {
      const res = await request(app).get(`/api/products/barcode/${testBarcode}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.id).toBe(testProduct.id);
    });

    it('Should filter products by categoryId in GET /api/products', async () => {
      const res = await request(app).get(`/api/products?categoryId=${testCategory.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.products[0].categoryId).toBe(testCategory.id);
    });

    it('Should prevent Merchant 2 from updating Merchant 1 product (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${merchant2Token}`)
        .send({ name: 'Hacked Milk Name' });

      expect(res.status).toBe(403);
    });

    it('Should update product details and barcode', async () => {
      const updatedBarcode = `BARCODE-UPD-${Date.now()}`;
      const res = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          name: 'Fresh Whole Milk 1.5L',
          price: 5.99,
          barcode: updatedBarcode
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.price).toBe(5.99);
      expect(res.body.data.product.barcode).toBe(updatedBarcode);
    });
  });

  // --- 3. Inventory Management & Negative Stock Guard Tests ---
  describe('Inventory System (/api/inventory)', () => {
    it('Should record inventory addition (+20)', async () => {
      const res = await request(app)
        .post('/api/inventory/movement')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          productId: testProduct.id,
          type: 'ADD',
          quantity: 20,
          reason: 'Supplier delivery'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inventory.quantity).toBe(50); // initial 30 + 20
    });

    it('Should reject deduction that causes negative stock (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/inventory/movement')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          productId: testProduct.id,
          type: 'DEDUCT',
          quantity: 999, // Exceeds 50 stock
          reason: 'Over-deduction attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot be negative');
    });

    it('Should update product status to OUT_OF_STOCK when inventory reaches 0', async () => {
      const res = await request(app)
        .post('/api/inventory/movement')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          productId: testProduct.id,
          type: 'ADJUSTMENT',
          quantity: 0,
          reason: 'Stock clear'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.inventory.quantity).toBe(0);

      // Verify product status synced to OUT_OF_STOCK
      const prodRes = await request(app).get(`/api/products/${testProduct.id}`);
      expect(prodRes.body.data.product.stock).toBe(0);
      expect(prodRes.body.data.product.status).toBe('OUT_OF_STOCK');
    });

    it('Should list inventory records GET /api/inventory', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${merchantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.inventories.length).toBeGreaterThan(0);
    });
  });

  // --- 4. Cleanup and Delete Verification ---
  describe('Product & Category Deletion', () => {
    it('Should delete product', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${merchantToken}`);

      expect(res.status).toBe(200);
    });

    it('Should delete category', async () => {
      const res = await request(app)
        .delete(`/api/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
