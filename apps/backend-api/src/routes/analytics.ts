import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@servicecore/shared-models';
import { requireRole } from '../middleware/rbac.middleware';
import { jobEstimateService } from '../services/job-estimate.service';

export const analyticsRouter = Router();

const ANALYTICS_ROLES = [
  Role.ROUTE_MANAGER,
  Role.HR_ADMIN,
  Role.PAYROLL_ADMIN,
  Role.EXECUTIVE,
  Role.SYSTEM_ADMIN,
] as const;

const periodSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

function parsePeriod(query: any): { start: Date; end: Date } {
  const now = new Date();
  const start = query.periodStart
    ? new Date(query.periodStart)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = query.periodEnd
    ? new Date(query.periodEnd)
    : now;
  return { start, end };
}

// ---------------------------------------------------------------------------
// GET /summary — analytics summary KPIs (real data)
// ---------------------------------------------------------------------------
analyticsRouter.get(
  '/summary',
  requireRole(...ANALYTICS_ROLES),
  async (req: Request, res: Response) => {
    const { start, end } = parsePeriod(req.query);
    try {
      const summary = await jobEstimateService.getAnalyticsSummary(start, end);
      res.json(summary);
    } catch (err) {
      console.error('[analytics/summary]', err);
      res.status(500).json({ error: 'Failed to generate analytics summary' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /cost-by-job — labor cost breakdown by job type (real data)
// ---------------------------------------------------------------------------
analyticsRouter.get(
  '/cost-by-job',
  requireRole(...ANALYTICS_ROLES),
  async (req: Request, res: Response) => {
    const { start, end } = parsePeriod(req.query);
    try {
      const data = await jobEstimateService.getCostByJobType(start, end);
      res.json({ data });
    } catch (err) {
      console.error('[analytics/cost-by-job]', err);
      res.status(500).json({ error: 'Failed to generate cost breakdown' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /top-ot — top overtime employees (real data)
// ---------------------------------------------------------------------------
analyticsRouter.get(
  '/top-ot',
  requireRole(...ANALYTICS_ROLES),
  async (req: Request, res: Response) => {
    const { start, end } = parsePeriod(req.query);
    const limit = parseInt(req.query.limit as string) || 5;
    try {
      const data = await jobEstimateService.getTopOTEmployees(start, end, limit);
      res.json({ data });
    } catch (err) {
      console.error('[analytics/top-ot]', err);
      res.status(500).json({ error: 'Failed to get OT rankings' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /insights — AI-generated labor insights (real data)
// ---------------------------------------------------------------------------
analyticsRouter.get(
  '/insights',
  requireRole(...ANALYTICS_ROLES),
  async (req: Request, res: Response) => {
    const { start, end } = parsePeriod(req.query);
    try {
      const insights = await jobEstimateService.generateInsights(start, end);
      res.json({ data: insights });
    } catch (err) {
      console.error('[analytics/insights]', err);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /estimate — job duration estimate for an employee (real data)
// ---------------------------------------------------------------------------
analyticsRouter.get(
  '/estimate',
  requireRole(...ANALYTICS_ROLES),
  async (req: Request, res: Response) => {
    const { employeeId, jobType, dayOfWeek } = req.query;
    if (!employeeId || !jobType) {
      res.status(400).json({ error: 'employeeId and jobType are required' });
      return;
    }
    try {
      const estimate = await jobEstimateService.getEstimate(
        employeeId as string,
        jobType as string,
        dayOfWeek !== undefined ? parseInt(dayOfWeek as string) : undefined
      );
      res.json({ data: estimate });
    } catch (err) {
      console.error('[analytics/estimate]', err);
      res.status(500).json({ error: 'Failed to get estimate' });
    }
  }
);

// ---------------------------------------------------------------------------
// LEGACY: GET /overview, /overtime, /labor-cost — redirect to new endpoints
// ---------------------------------------------------------------------------
analyticsRouter.get('/overview', requireRole(...ANALYTICS_ROLES), async (req: Request, res: Response) => {
  const { start, end } = parsePeriod(req.query);
  const summary = await jobEstimateService.getAnalyticsSummary(start, end);
  res.json(summary);
});

analyticsRouter.get('/overtime', requireRole(...ANALYTICS_ROLES), async (req: Request, res: Response) => {
  const { start, end } = parsePeriod(req.query);
  const data = await jobEstimateService.getTopOTEmployees(start, end, 10);
  res.json({ data });
});

analyticsRouter.get('/labor-cost', requireRole(...ANALYTICS_ROLES), async (req: Request, res: Response) => {
  const { start, end } = parsePeriod(req.query);
  const data = await jobEstimateService.getCostByJobType(start, end);
  res.json({ data });
});
