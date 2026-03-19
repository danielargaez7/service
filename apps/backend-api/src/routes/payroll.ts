import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@servicecore/shared-models';
import { requireRole } from '../middleware/rbac.middleware';
import { TimeTrexService } from '../services/timetrex.service';
import { payrollService } from '../services/payroll.service';
import { getSupportedFormats } from '../services/payroll-formatters/index';

export const payrollRouter = Router();
const timetrexService = new TimeTrexService();
const TIMETREX_INTEGRATION_ENABLED =
  process.env.TIMETREX_INTEGRATION_ENABLED === 'true';

// ---------------------------------------------------------------------------
// GET /timetrex-auth-check — quick auth mode/status diagnostics for demos
// ---------------------------------------------------------------------------
payrollRouter.get(
  '/timetrex-auth-check',
  requireRole(Role.PAYROLL_ADMIN, Role.HR_ADMIN, Role.SYSTEM_ADMIN),
  (_req: Request, res: Response) => {
    res.json({
      integrationEnabled: TIMETREX_INTEGRATION_ENABLED,
      diagnostics: timetrexService.getAuthDiagnostics(),
      checkedAt: new Date().toISOString(),
    });
  }
);

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const previewQuerySchema = z.object({
  periodStart: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodStart')
    .optional(),
  periodEnd: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodEnd')
    .optional(),
  employeeIds: z.string().optional(), // comma-separated
});

const exportSchema = z.object({
  periodStart: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodStart'),
  periodEnd: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid periodEnd'),
  employeeIds: z.array(z.string()).optional(),
  format: z.enum(['CSV', 'ADP', 'GUSTO', 'QUICKBOOKS', 'JSON', 'TIMETRIX']),
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
// GET /formats — list supported export formats
// ---------------------------------------------------------------------------
payrollRouter.get(
  '/formats',
  requireRole(Role.PAYROLL_ADMIN, Role.HR_ADMIN, Role.SYSTEM_ADMIN),
  (_req: Request, res: Response) => {
    res.json({ formats: ['JSON', ...getSupportedFormats(), 'TIMETRIX'] });
  }
);

// ---------------------------------------------------------------------------
// GET /preview — pre-payroll audit report
// ---------------------------------------------------------------------------
payrollRouter.get(
  '/preview',
  requireRole(
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
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

    const { periodStart, periodEnd, employeeIds: empIdsStr } = parsed.data;

    // TimeTrex passthrough
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

    // Default to current semi-monthly period
    const now = new Date();
    const start = periodStart
      ? new Date(periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = periodEnd
      ? new Date(periodEnd)
      : new Date(now.getFullYear(), now.getMonth(), 15);

    const empIds = empIdsStr ? empIdsStr.split(',').map((s) => s.trim()) : undefined;

    try {
      const preview = await payrollService.generatePreview(start, end, empIds);

      // Compute totals
      const totals = preview.reduce(
        (acc, row) => ({
          employees: acc.employees + 1,
          totalHours: acc.totalHours + row.regularHours + row.overtimeHours + row.doubleTimeHours,
          regularHours: acc.regularHours + row.regularHours,
          overtimeHours: acc.overtimeHours + row.overtimeHours,
          totalPay: acc.totalPay + row.totalPay,
          flaggedItems: acc.flaggedItems + row.warnings.length,
        }),
        { employees: 0, totalHours: 0, regularHours: 0, overtimeHours: 0, totalPay: 0, flaggedItems: 0 }
      );

      res.json({
        data: preview,
        totals,
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        source: 'database',
      });
    } catch (error) {
      console.error('[payroll/preview]', error);
      apiError(res, 500, 'PREVIEW_ERROR', 'Failed to generate payroll preview');
    }
  }
);

// ---------------------------------------------------------------------------
// POST /export — export payroll to ADP / Gusto / QuickBooks / CSV / JSON
// ---------------------------------------------------------------------------
payrollRouter.post(
  '/export',
  requireRole(Role.PAYROLL_ADMIN, Role.HR_ADMIN, Role.SYSTEM_ADMIN),
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

    // TimeTrex passthrough
    if (TIMETREX_INTEGRATION_ENABLED && payload.format === 'TIMETRIX') {
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

    try {
      const result = await payrollService.exportPayroll(
        new Date(payload.periodStart),
        new Date(payload.periodEnd),
        payload.format,
        req.user?.sub ?? 'unknown',
        payload.employeeIds
      );

      if ('json' in result) {
        res.json({ data: result.json, format: 'JSON', source: 'database' });
        return;
      }

      // CSV download
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.csv);
    } catch (error) {
      console.error('[payroll/export]', error);
      apiError(res, 500, 'EXPORT_ERROR', (error as Error).message);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /what-if — what-if simulator
// ---------------------------------------------------------------------------
payrollRouter.post(
  '/what-if',
  requireRole(
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
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

    const { additionalHours } = parsed.data;

    // Get real baseline from current period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 15);

    try {
      const preview = await payrollService.generatePreview(periodStart, periodEnd);
      const baseline = preview.reduce(
        (acc, r) => ({
          regularHours: acc.regularHours + r.regularHours,
          overtimeHours: acc.overtimeHours + r.overtimeHours,
          totalPay: acc.totalPay + r.totalPay,
        }),
        { regularHours: 0, overtimeHours: 0, totalPay: 0 }
      );

      // Simulate: additional hours per employee at avg OT rate
      const avgRate = preview.length > 0
        ? preview.reduce((sum, r) => sum + r.hourlyRate, 0) / preview.length
        : 30;
      const otRate = avgRate * 1.5;
      const costDelta = additionalHours * preview.length * otRate;

      res.json({
        baseline,
        simulated: {
          regularHours: baseline.regularHours,
          overtimeHours: baseline.overtimeHours + (additionalHours * preview.length),
          totalPay: baseline.totalPay + costDelta,
        },
        costDelta,
        employeesAffected: preview.length,
        additionalHoursPerEmployee: additionalHours,
      });
    } catch (error) {
      console.error('[payroll/what-if]', error);
      apiError(res, 500, 'WHAT_IF_ERROR', 'Failed to run simulation');
    }
  }
);
