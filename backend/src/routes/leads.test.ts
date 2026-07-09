import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../db';

describe('Leads API Integration Tests', () => {
  beforeAll(async () => {
    // Clear database before running integration tests
    await prisma.lead.deleteMany();
  });

  it('should reset database successfully', async () => {
    const res = await request(app)
      .delete('/api/leads/reset')
      .expect(200);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('reset successful');
  });

  it('should return empty list of leads initially', async () => {
    const res = await request(app)
      .get('/api/leads')
      .expect(200);

    expect(res.body).toHaveProperty('leads');
    expect(res.body).toHaveProperty('totalCount');
    expect(res.body.leads).toBeInstanceOf(Array);
    expect(res.body.leads.length).toBe(0);
    expect(res.body.totalCount).toBe(0);
  });

  it('should return empty list of sessions initially', async () => {
    const res = await request(app)
      .get('/api/leads/sessions')
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(0);
  });

  it('should add a mock lead directly and retrieve it via API', async () => {
    // Insert mock lead
    await prisma.lead.create({
      data: {
        import_session_id: 'test-session',
        name: 'John Test',
        email: 'john.test@example.com',
        mobile_without_country_code: '1234567890',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
      },
    });

    const res = await request(app)
      .get('/api/leads')
      .expect(200);

    expect(res.body.leads.length).toBe(1);
    expect(res.body.leads[0].name).toBe('John Test');
    expect(res.body.leads[0].email).toBe('john.test@example.com');
    expect(res.body.totalCount).toBe(1);

    // Test search filter
    const searchRes = await request(app)
      .get('/api/leads?search=John')
      .expect(200);
    expect(searchRes.body.leads.length).toBe(1);

    const searchResFail = await request(app)
      .get('/api/leads?search=InvalidName')
      .expect(200);
    expect(searchResFail.body.leads.length).toBe(0);
  });
});
