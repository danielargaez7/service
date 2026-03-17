import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  PayrollPreview,
  OvertimeResult,
  TimesheetStatus,
  JobType,
  PayRate,
  TimeEntry,
  EmployeeClass,
} from '@servicecore/shared-models';
import { requireRole } from '../middleware/rbac.middleware';
import { TimeTrexService } from '../services/timetrex.service';
import { OvertimeService } from '../services/overtime.service';
import { AnomalyService } from '../services/anomaly.service';

export const payrollRouter = Router();
const timetrexService = new TimeTrexService();
const overtimeService = new OvertimeService();
const anomalyService = new AnomalyService();
const TIMETREX_INTEGRATION_ENABLED =
  process.env.TIMETREX_INTEGRATION_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------
const stubOT: OvertimeResult = {
  regularHours: 40,
  overtimeHours: 5.5,
  doubleTimeHours: 0,
  regularPay: 1200.0,
  overtimePay: 247.5,
  doubleTimePay: 0,
  totalPay: 1447.5,
  calculationMethod: 'CA_DAILY_WEEKLY',
  warnings: ['Approaching weekly OT cap'],
};

const stubPayRate: PayRate = {
  id: 'pr-001',
  employeeId: 'emp-002',
  jobType: JobType.RESIDENTIAL_SANITATION,
  ratePerHour: 30.0,
  effectiveFrom: new Date('2025-01-01'),
  effectiveTo: null,
};

const stubEntry: TimeEntry = {
  id: 'ts-001',
  employeeId: 'emp-002',
  clockIn: new Date('2026-03-10T06:00:00Z'),
  clockOut: new Date('2026-03-10T14:30:00Z'),
  jobType: JobType.RESIDENTIAL_SANITATION,
  gpsIn: { lat: 34.0522, lng: -118.2437, accuracy: 5 },
  gpsOut: { lat: 34.0525, lng: -118.244, accuracy: 4 },
  photoInUrl: null,
  photoOutUrl: null,
  status: TimesheetStatus.APPROVED,
  approvedById: 'emp-001',
  approvedAt: new Date('2026-03-11T09:00:00Z'),
  flagReason: null,
  notes: null,
  createdAt: new Date('2026-03-10T06:00:00Z'),
  updatedAt: new Date('2026-03-11T09:00:00Z'),
};

const previewQuerySchema = z.object({
  periodStart: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodStart')
    .optional(),
  periodEnd: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodEnd')
    .optional(),
});

const exportSchema = z.object({
  periodStart: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodStart'),
  periodEnd: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodEnd'),
  employeeIds: z.array(z.string()).optional(),
  format: z.enum(['CSV', 'TIMETRIX', 'JSON']),
});

const whatIfSchema = z.object({
  employeeId: z.string().optional(),
  additionalHours: z.number().min(0).max(24).default(0),
});

function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// GET /preview — pre-payroll audit report
// ---------------------------------------------------------------------------
payrollRouter.get('/preview', async (req: Request, res: Response) => {
  const parsed = previewQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid payroll preview query parameters',
      parsed.error.flatten()
    );
    return;
  }

  const { periodStart, periodEnd } = parsed.data;

  if (TIMETREX_INTEGRATION_ENABLED) {
    try {
      const data = await timetrexService.previewPayroll({
        periodStart,
        periodEnd,
      });
      res.json({ data, source: 'timetrex' });
      return;
    } catch (error) {
      apiError(
        res,
        502,
        'TIMETREX_UPSTREAM_ERROR',
        'Failed to fetch payroll preview from TimeTrex',
        { message: (error as Error).message }
      );
      return;
    }
  }

  const calculatedOT = overtimeService.calculateForEntries(
    'emp-002',
    [stubEntry],
    [stubPayRate],
    {
      employeeClass: EmployeeClass.CDL_B,
      stateCode: 'CA',
      isMotorCarrierExempt: false,
    }
  );
  const anomalyScores = await anomalyService.scoreTimesheetEntries([stubEntry]);

  const preview: PayrollPreview = {
    employeeId: 'emp-002',
    employeeName: 'Carlos Rivera',
    periodStart: periodStart ? new Date(periodStart) : new Date('2026-03-09'),
    periodEnd: periodEnd ? new Date(periodEnd) : new Date('2026-03-15'),
    entries: [stubEntry],
    overtime: calculatedOT,
    payRates: [stubPayRate],
  };

  res.json({
    data: [preview],
    period: {
      start: (periodStart ?? '2026-03-09'),
      end: (periodEnd ?? '2026-03-15'),
    },
    anomalyScores,
    source: 'stub',
  });
});

// ---------------------------------------------------------------------------
// POST /export — trigger QuickBooks / TimeTrex export
// ---------------------------------------------------------------------------
payrollRouter.post(
  '/export',
  requireRole('PAYROLL_ADMIN', 'HR_ADMIN', 'SYSTEM_ADMIN'),
  async (req: Request, res: Response) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid payroll export payload',
        parsed.error.flatten()
      );
      return;
    }

    const payload = parsed.data;

    if (TIMETREX_INTEGRATION_ENABLED) {
      try {
        const exportResult = await timetrexService.exportPayroll(payload);
        res.status(202).json({ data: exportResult, source: 'timetrex' });
        return;
      } catch (error) {
        apiError(
          res,
          502,
          'TIMETREX_UPSTREAM_ERROR',
          'Failed to queue payroll export in TimeTrex',
          { message: (error as Error).message }
        );
        return;
      }
    }

    res.status(202).json({
      exportId: `exp-${Date.now()}`,
      status: 'QUEUED',
      format: payload.format,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      estimatedRecords: 24,
      message: 'Payroll export job queued',
      source: 'stub',
    });
  }
);

// ---------------------------------------------------------------------------
// POST /what-if — what-if simulator
// ---------------------------------------------------------------------------
payrollRouter.post('/what-if', (req: Request, res: Response) => {
  const parsed = whatIfSchema.safeParse(req.body);
  if (!parsed.success) {
    apiError(
      res,
      400,
      'VALIDATION_ERROR',
      'Invalid what-if simulation payload',
      parsed.error.flatten()
    );
    return;
  }

  const { employeeId, additionalHours } = parsed.data;

  const simulated: OvertimeResult = {
    ...stubOT,
    overtimeHours: stubOT.overtimeHours + additionalHours,
    overtimePay: stubOT.overtimePay + additionalHours * 45,
    totalPay: stubOT.totalPay + additionalHours * 45,
    warnings: [
      ...stubOT.warnings,
      `Simulated ${additionalHours}h additional — OT cost impact shown`,
    ],
  };

  res.json({
    employeeId: employeeId ?? 'emp-002',
    baseline: stubOT,
    simulated,
    costDelta: additionalHours * 45,
  });
});
