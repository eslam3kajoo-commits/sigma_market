import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Category Creation & Duplicate 409 Verification', () => {
  it('should return 201 for a new category and 409 for a duplicate category', async () => {
    const adminEmail = `admin_cat_test_${Date.now()}@example.com`;
    const password = 'Password123!';

    // 1. Register new Admin user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Admin Cat Tester',
        email: adminEmail,
        password: password,
        roleName: 'Admin'
      });

    expect(regRes.status).toBe(201);

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: password
      });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;

    const uniqueCatName = `Test Category ${Date.now()}`;

    // 3. Create new category -> Expect 201 Created
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: uniqueCatName,
        description: 'Test Category Description'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    // 4. Try to create the duplicate category -> Expect 409 Conflict with message 'هذا القسم موجود بالفعل.'
    const dupRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: uniqueCatName,
        description: 'Duplicate Category Test'
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toBe('هذا القسم موجود بالفعل.');
  });
});
