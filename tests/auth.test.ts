import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

describe('Smart Warranty Platform - Authentication API Suite', () => {
  const testUser = {
    email: 'testcustomer@smartwarranty.local',
    password: 'Password123!',
    fullName: 'Test Customer',
    roleName: 'Customer'
  };

  let authToken = '';

  beforeAll(async () => {
    // Ensure roles exist in DB before running tests
    const customerRole = await prisma.role.upsert({
      where: { name: 'Customer' },
      update: {},
      create: {
        name: 'Customer',
        description: 'Customer role',
        permissions: JSON.stringify(['profile:read'])
      }
    });

    // Cleanup any pre-existing test user
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  it('1. Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.token).toBeDefined();
  });

  it('2. Should reject registration with duplicate email (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('3. Should reject registration with missing mandatory fields (422 Unprocessable)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('4. Should authenticate valid user login and return JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    authToken = res.body.data.token;
  });

  it('5. Should reject login with invalid password (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('6. Should fetch user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('7. Should reject protected route access without token (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
