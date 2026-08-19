import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('Smart Warranty Platform - System Integration Suite (Phase 9 & 10)', () => {
  const merchantCredentials = {
    email: 'integmerchant@smartwarranty.local',
    password: 'MerchantPass123!',
    fullName: 'Integration Store Merchant',
    roleName: 'Merchant'
  };

  let merchantToken = '';

  beforeAll(async () => {
    await prisma.role.upsert({
      where: { name: 'Merchant' },
      update: {},
      create: { name: 'Merchant', description: 'Merchant Role', permissions: JSON.stringify(['product:create']) }
    });

    await prisma.user.deleteMany({ where: { email: merchantCredentials.email } });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { merchant: { email: merchantCredentials.email } } });
    await prisma.user.deleteMany({ where: { email: merchantCredentials.email } });
    await prisma.$disconnect();
  });

  it('1. End-to-End Flow: Register Merchant -> Login -> Create Warranty Product -> Query Product Catalog', async () => {
    // Step A: Register Merchant
    const regRes = await request(app)
      .post('/api/auth/register')
      .send(merchantCredentials);

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // Step B: Login Merchant
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: merchantCredentials.email, password: merchantCredentials.password });

    expect(loginRes.status).toBe(200);
    merchantToken = loginRes.body.data.token;
    expect(merchantToken).toBeDefined();

    // Step C: Create Warranty Product
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'Smart Appliance 8K TV',
        description: 'Next generation appliance with 5-year digital warranty',
        price: 4999.99,
        barcode: 'SW-8KTV-INTEG-001',
        stock: 15
      });

    expect(prodRes.status).toBe(201);
    expect(prodRes.body.data.product.barcode).toBe('SW-8KTV-INTEG-001');

    // Step D: Public Catalog Barcode Query
    const barcodeRes = await request(app).get('/api/products/barcode/SW-8KTV-INTEG-001');
    expect(barcodeRes.status).toBe(200);
    expect(barcodeRes.body.data.product.name).toBe('Smart Appliance 8K TV');
  });
});
