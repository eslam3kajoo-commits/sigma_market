import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Admin User Deletion & Test Account Cleanup Suite', () => {
  it('should support deleting a specific user and clearing test accounts without affecting real accounts', async () => {
    const adminEmail = `admin_del_test_${Date.now()}@example.com`;
    const password = 'Password123!';

    // 1. Register Admin User
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Admin Delete Tester',
        email: adminEmail,
        password,
        roleName: 'Admin'
      });

    // Login Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password });

    expect(adminLoginRes.status).toBe(200);
    const token = adminLoginRes.body.data.token;

    // 2. Register a temporary test user to delete individually
    const tempUserEmail = `temp_user_${Date.now()}@example.com`;
    const tempRegRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Temp User To Delete',
        email: tempUserEmail,
        password,
        roleName: 'Customer'
      });

    expect(tempRegRes.status).toBe(201);
    const tempUserId = tempRegRes.body.data.user.id;

    // 3. Delete individual user -> DELETE /api/admin/users/:id
    const deleteRes = await request(app)
      .delete(`/api/admin/users/${tempUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify user is gone
    const listRes = await request(app)
      .get(`/api/admin/users?search=${encodeURIComponent(tempUserEmail)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.data.users.length).toBe(0);

    // 4. Register another dummy test user
    const dummyTestEmail = `test_account_cleanup_${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test Account For Cleanup',
        email: dummyTestEmail,
        password,
        roleName: 'Customer'
      });

    // 5. Bulk clear test accounts -> DELETE /api/admin/users/clear-test-accounts
    const clearRes = await request(app)
      .delete('/api/admin/users/clear-test-accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);
    expect(clearRes.body.data.deletedCount).toBeGreaterThanOrEqual(1);

    // 6. Verify metrics telemetry works cleanly
    const metricsRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${token}`);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.data.metrics.totalUsers).toBeGreaterThan(0);
  });
});
