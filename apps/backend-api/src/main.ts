import express from 'express';
import cors from 'cors';
import compression from 'compression';
import http from 'http';
import path from 'path';

import { authRouter } from './routes/auth';
import { timesheetsRouter } from './routes/timesheets';
import { employeesRouter } from './routes/employees';
import { payrollRouter } from './routes/payroll';
import { complianceRouter } from './routes/compliance';
import { analyticsRouter } from './routes/analytics';
import { aiRouter } from './routes/ai';
import { scheduleRouter } from './routes/schedule';
import { authenticate, requireApiKeyIfConfigured } from './middleware/auth.middleware';
import {
  aiRateLimit,
  authLoginRateLimit,
  authRefreshRateLimit,
} from './middleware/rate-limit.middleware';
import { createWebSocketServer } from './websocket/server';
import { webhooksRouter } from './routes/webhooks';
import { startMissedClockoutJob } from './jobs/missed-clockout.job';
import { startTimesheetReminderJob } from './jobs/timesheet-reminder.job';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use('/uploads', express.static('uploads'));

// ---------------------------------------------------------------------------
// Health check (public)
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Public auth routes
// ---------------------------------------------------------------------------
app.use('/api/auth/login', authLoginRateLimit);
app.use('/api/auth/refresh', authRefreshRateLimit);
app.use('/api/auth', authRouter);

// ---------------------------------------------------------------------------
// Webhook routes — server-to-server, uses shared secret (not JWT)
// ---------------------------------------------------------------------------
app.use('/api/webhooks', webhooksRouter);

// ---------------------------------------------------------------------------
// Protected routes — all require a valid JWT
// ---------------------------------------------------------------------------
app.use('/api/timesheets', requireApiKeyIfConfigured, authenticate, timesheetsRouter);
app.use('/api/employees', requireApiKeyIfConfigured, authenticate, employeesRouter);
app.use('/api/payroll', requireApiKeyIfConfigured, authenticate, payrollRouter);
app.use('/api/compliance', requireApiKeyIfConfigured, authenticate, complianceRouter);
app.use('/api/analytics', requireApiKeyIfConfigured, authenticate, analyticsRouter);
app.use('/api/ai', requireApiKeyIfConfigured, authenticate, aiRateLimit, aiRouter);
app.use('/api/schedule', requireApiKeyIfConfigured, authenticate, scheduleRouter);

// ---------------------------------------------------------------------------
// Serve frontend apps in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(process.cwd(), 'public');

  // Manager Dashboard at /dashboard and root /
  app.use('/dashboard', express.static(path.join(publicDir, 'dashboard')));
  app.use('/driver', express.static(path.join(publicDir, 'driver')));

  // Serve dashboard as default for root
  app.use(express.static(path.join(publicDir, 'dashboard')));

  // SPA fallback — serve index.html for any non-API route
  app.get(/^\/(?!api\/)(?!uploads\/)(?!driver\/).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
  });
  app.get('/driver/*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'driver', 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error('[ERROR]', err.message, err.stack);
    const status = err.status ?? 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
      status,
      timestamp: new Date().toISOString(),
    });
  }
);

// ---------------------------------------------------------------------------
// Create HTTP server + WebSocket, then listen
// ---------------------------------------------------------------------------
const server = http.createServer(app);
const wss = createWebSocketServer(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
    console.log(`[ ws    ] WebSocket server attached`);
    startMissedClockoutJob();
    startTimesheetReminderJob();
  });
}

export { app, server, wss };
