import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Smart Warranty Platform - Address Management Suite (Phase 5)', () => {
  let customer1Token: string;
  let customer2Token: string;
  let customer1User: any;
  let customer2User: any;
  let createdAddressId: string;

  beforeAll(async () => {
    const customerRole = await prisma.role.upsert({
      where: { name: 'Customer' },
      update: {},
      create: { name: 'Customer', description: 'Customer role', permissions: JSON.stringify(['address:manage']) }
    });

    const hash = await bcrypt.hash('AddressPass123!', 10);

    customer1User = await prisma.user.create({
      data: { email: 'addruser1@smartwarranty.local', fullName: 'Address User One', passwordHash: hash, roleId: customerRole.id }
    });

    customer2User = await prisma.user.create({
      data: { email: 'addruser2@smartwarranty.local', fullName: 'Address User Two', passwordHash: hash, roleId: customerRole.id }
    });

    customer1Token = generateToken({ userId: customer1User.id, email: customer1User.email, roleName: 'Customer', roleId: customerRole.id });
    customer2Token = generateToken({ userId: customer2User.id, email: customer2User.email, roleName: 'Customer', roleId: customerRole.id });
  });

  afterAll(async () => {
    await prisma.address.deleteMany({ where: { userId: { in: [customer1User.id, customer2User.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [customer1User.id, customer2User.id] } } });
    await prisma.$disconnect();
  });

  it('1. Should allow customer to create a new address (201 Created)', async () => {
    const addressData = {
      street: '123 King Fahd Road',
      city: 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '11564',
      country: 'Saudi Arabia',
      isDefault: true
    };

    const res = await request(app)
      .post('/api/users/addresses')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send(addressData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address.userId).toBe(customer1User.id);
    expect(res.body.data.address.isDefault).toBe(true);

    createdAddressId = res.body.data.address.id;
  });

  it('2. Should list addresses for authenticated customer', async () => {
    const res = await request(app)
      .get('/api/users/addresses')
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.addresses.length).toBeGreaterThan(0);
  });

  it('3. Should reject User 2 attempting to modify User 1 address (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/users/addresses/${createdAddressId}`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ street: 'Hacked Street' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Should allow User 1 to update their own address', async () => {
    const res = await request(app)
      .put(`/api/users/addresses/${createdAddressId}`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ city: 'Jeddah' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address.city).toBe('Jeddah');
  });

  it('5. Should allow User 1 to delete their address', async () => {
    const res = await request(app)
      .delete(`/api/users/addresses/${createdAddressId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
