import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Smart Warranty Platform - Security & Rate Limiting Suite (Phase 7)', () => {
  it('1. Health check returns 200 OK without exposing stack traces', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.environment).toBeDefined();
    expect(res.body.stack).toBeUndefined();
  });

  it('2. Invalid JSON input triggers 400 or 422 Bad Request without server crash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{ bad json }');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Non-existent API endpoint returns sanitized 404 JSON response', async () => {
    const res = await request(app).get('/api/non-existent-route-99');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });
});
