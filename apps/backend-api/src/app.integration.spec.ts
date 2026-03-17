import request from 'supertest';
import type { Express } from 'express';
import type http from 'http';
import type WebSocket from 'ws';

describe('backend-api integration routes', () => {
  let app: Express;
  let accessToken: string;
  let payrollToken: string;
  let driverToken: string;
  let executiveToken: string;
  let server: http.Server;
  let wss: WebSocket.Server;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.REQUIRE_API_KEY = 'false';
    process.env.TIMETREX_INTEGRATION_ENABLED = 'false';
    process.env.TIMETREX_API_MODE = 'legacy_rpc';
    process.env.TIMETREX_AUTH_MODE = 'env_session';
    process.env.TIMETREX_SESSION_COOKIE = 'SessionID=test-session; CSRF-Token=test-csrf';
    process.env.TIMETREX_CSRF_TOKEN = 'test-csrf';

    jest.resetModules();
    const mainModule = await import('./main');
    app = mainModule.app;
    server = mainModule.server;
    wss = mainModule.wss;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@servicecore.com', password: 'demo' });
    accessToken = managerLogin.body.accessToken;

    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'driver@servicecore.com', password: 'demo' });
    driverToken = driverLogin.body.accessToken;

    const payrollLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'payroll@servicecore.com', password: 'demo' });
    payrollToken = payrollLogin.body.accessToken;

    const executiveLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'exec@servicecore.com', password: 'demo' });
    executiveToken = executiveLogin.body.accessToken;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    delete process.env.NODE_ENV;
  });

  it('accepts a timesheet punch', async () => {
    const response = await request(app)
      .post('/api/timesheets/punch')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'IN',
        timestamp: '2026-03-17T06:00:00.000Z',
        gps: { lat: 39.7392, lng: -104.9903, accuracy: 12 },
        jobType: 'RESIDENTIAL_SANITATION',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('data.id');
    expect(response.body).toHaveProperty('anomaly.score');
  });

  it('returns a payroll preview', async () => {
    const response = await request(app)
      .get('/api/payroll/preview')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('source');
  });

  it('queues a payroll export for authorized roles', async () => {
    const response = await request(app)
      .post('/api/payroll/export')
      .set('Authorization', `Bearer ${payrollToken}`)
      .send({
        periodStart: '2026-03-09',
        periodEnd: '2026-03-15',
        format: 'CSV',
      });

    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('status', 'QUEUED');
  });

  it('stores AI feedback and returns aggregate counts', async () => {
    const response = await request(app)
      .post('/api/ai/feedback')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        responseId: 'nlq-test-response',
        rating: 'UP',
        comment: 'Helpful result',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('aggregate.up', 1);
    expect(response.body).toHaveProperty('aggregate.down', 0);
  });

  it('returns TimeTrex auth diagnostics for payroll admins', async () => {
    const response = await request(app)
      .get('/api/payroll/timetrex-auth-check')
      .set('Authorization', `Bearer ${payrollToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('diagnostics.apiMode', 'legacy_rpc');
    expect(response.body).toHaveProperty('diagnostics.authMode', 'env_session');
  });

  it('rejects unknown demo logins', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@servicecore.com', password: 'demo' });

    expect(response.status).toBe(401);
  });

  it('blocks drivers from viewing active workforce roster', async () => {
    const response = await request(app)
      .get('/api/timesheets/active')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(response.status).toBe(403);
  });

  it('blocks executives from payroll preview access', async () => {
    const response = await request(app)
      .get('/api/payroll/preview')
      .set('Authorization', `Bearer ${executiveToken}`);

    expect(response.status).toBe(403);
  });
});
