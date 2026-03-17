import { Router, Request, Response } from 'express';
import {
  PayrollPreview,
  OvertimeResult,
  TimesheetStatus,
  JobType,
  PayRate,
  TimeEntry,
} from '@servicecore/shared-models';

export const payrollRouter = Router();

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

// ---------------------------------------------------------------------------
// GET /preview — pre-payroll audit report
// ---------------------------------------------------------------------------
payrollRouter.get('/preview', (_req: Request, res: Response) => {
  const preview: PayrollPreview = {
    employeeId: 'emp-002',
    employeeName: 'Carlos Rivera',
    periodStart: new Date('2026-03-09'),
    periodEnd: new Date('2026-03-15'),
    entries: [stubEntry],
    overtime: stubOT,
    payRates: [stubPayRate],
  };

  res.json({ data: [preview], period: { start: '2026-03-09', end: '2026-03-15' } });
});

// ---------------------------------------------------------------------------
// POST /export — trigger QuickBooks / TimeTrex export
// ---------------------------------------------------------------------------
payrollRouter.post('/export', (req: Request, res: Response) => {
  const { periodStart, periodEnd, format } = req.body;

  if (!periodStart || !periodEnd || !format) {
    res
      .status(400)
      .json({ error: 'periodStart, periodEnd, and format are required' });
    return;
  }

  res.json({
    exportId: `exp-${Date.now()}`,
    status: 'QUEUED',
    format,
    periodStart,
    periodEnd,
    estimatedRecords: 24,
    message: 'Payroll export job queued',
  });
});

// ---------------------------------------------------------------------------
// POST /what-if — what-if simulator
// ---------------------------------------------------------------------------
payrollRouter.post('/what-if', (req: Request, res: Response) => {
  const { employeeId, additionalHours = 0 } = req.body;

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
