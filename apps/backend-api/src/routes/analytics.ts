import { Router, Request, Response } from 'express';
import {
  DashboardOverview,
  OvertimeTrend,
  LaborCostByJob,
  JobType,
} from '@servicecore/shared-models';

export const analyticsRouter = Router();

// ---------------------------------------------------------------------------
// GET /overview — dashboard KPIs
// ---------------------------------------------------------------------------
analyticsRouter.get('/overview', (_req: Request, res: Response) => {
  const overview: DashboardOverview = {
    totalActiveWorkers: 47,
    totalClockedInToday: 32,
    todayLaborCost: 12840.5,
    unapprovedTimesheets: 14,
    otHoursThisWeek: 38.5,
    complianceRisks: 3,
  };

  res.json(overview);
});

// ---------------------------------------------------------------------------
// GET /overtime — OT trends
// ---------------------------------------------------------------------------
analyticsRouter.get('/overtime', (_req: Request, res: Response) => {
  const trends: OvertimeTrend[] = [
    {
      date: '2026-03-10',
      regularHours: 320,
      overtimeHours: 22,
      doubleTimeHours: 0,
      totalCost: 12400,
    },
    {
      date: '2026-03-11',
      regularHours: 318,
      overtimeHours: 26,
      doubleTimeHours: 2,
      totalCost: 13200,
    },
    {
      date: '2026-03-12',
      regularHours: 310,
      overtimeHours: 30,
      doubleTimeHours: 4,
      totalCost: 13800,
    },
    {
      date: '2026-03-13',
      regularHours: 324,
      overtimeHours: 18,
      doubleTimeHours: 0,
      totalCost: 12100,
    },
    {
      date: '2026-03-14',
      regularHours: 300,
      overtimeHours: 14,
      doubleTimeHours: 0,
      totalCost: 11200,
    },
  ];

  res.json({ data: trends });
});

// ---------------------------------------------------------------------------
// GET /labor-cost — labor cost breakdowns
// ---------------------------------------------------------------------------
analyticsRouter.get('/labor-cost', (_req: Request, res: Response) => {
  const byJob: LaborCostByJob[] = [
    {
      jobType: JobType.RESIDENTIAL_SANITATION,
      totalHours: 480,
      totalCost: 16800,
      employeeCount: 18,
    },
    {
      jobType: JobType.SEPTIC_PUMP,
      totalHours: 160,
      totalCost: 6400,
      employeeCount: 6,
    },
    {
      jobType: JobType.ROLL_OFF_DELIVERY,
      totalHours: 120,
      totalCost: 4800,
      employeeCount: 5,
    },
    {
      jobType: JobType.GREASE_TRAP,
      totalHours: 80,
      totalCost: 3200,
      employeeCount: 3,
    },
    {
      jobType: JobType.YARD_MAINTENANCE,
      totalHours: 40,
      totalCost: 1200,
      employeeCount: 2,
    },
  ];

  res.json({ data: byJob });
});
