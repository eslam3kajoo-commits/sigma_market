import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateToken } from '../src/utils/jwt';
import bcrypt from 'bcryptjs';

describe('Smart Warranty Platform - Admin Panel Suite (Phase 6)', () => {
  let adminToken: string;
  let customerToken: string;
  let targetUser: any;

  beforeAll(async () => {
    const adminRole = await prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', description: 'Admin role', permissions: JSON.stringify(['*']) }
    });

    const customerRole = await prisma.role.upsert({
      where: { name: 'Customer' },
      update: {},
      create: { name: 'Customer', description: 'Customer role', permissions: JSON.stringify(['profile:read']) }
    });

    const hash = await bcrypt.hash('AdminPass123!', 10);

    const adminUser = await prisma.user.create({
      data: { email: 'adminpaneltest@smartwarranty.local', fullName: 'Admin Tester', passwordHash: hash, roleId: adminRole.id }
    });

    targetUser = await prisma.user.create({
      data: { email: 'targetuser@smartwarranty.local', fullName: 'Target User', passwordHash: hash, roleId: customerRole.id }
    });

    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, roleName: 'Admin', roleId: adminRole.id });
    customerToken = generateToken({ userId: targetUser.id, email: targetUser.email, roleName: 'Customer', roleId: customerRole.id });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['adminpaneltest@smartwarranty.local', 'targetuser@smartwarranty.local'] } }
    });
    await prisma.$disconnect();
  });

  it('1. Admin can fetch platform telemetry metrics (200 OK)', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.totalUsers).toBeGreaterThan(0);
  });

  it('2. Non-admin customer is rejected from admin metrics (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Admin can list users with role filters', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=Customer')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
  });

  it('4. Admin can toggle user status to SUSPENDED', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${targetUser.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('SUSPENDED');
  });

  it('5. Suspended user login attempt is rejected (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'targetuser@smartwarranty.local',
        password: 'AdminPass123!'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
