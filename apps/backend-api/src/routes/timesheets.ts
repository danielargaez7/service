import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import {
  TimesheetStatus,
  JobType,
  ClockPunchDto,
  Role,
} from '@servicecore/shared-models';
import { requireRole } from '../middleware/rbac.middleware';
import { KimaiService } from '../services/kimai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NotificationService } from '../services/notification.service';
import { timesheetService } from '../services/timesheet.service';
import { OvertimeService } from '../services/overtime.service';
import prisma from '../prisma';

const overtimeService = new OvertimeService();

export const timesheetsRouter = Router();
const kimaiService = new KimaiService();
const anomalyService = new AnomalyService();
const notificationService = new NotificationService();
const KIMAI_INTEGRATION_ENABLED =
  process.env.KIMAI_INTEGRATION_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timesheetQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.nativeEnum(TimesheetStatus).optional(),
  startDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid startDate')
    .optional(),
  endDate: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid endDate')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const punchSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  timestamp: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid timestamp'),
  gps: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number(),
  }),
  jobType: z.nativeEnum(JobType).optional(),
  photoBase64: z.string().min(1).optional(),
});

const attachmentSchema = z.object({
  shiftId: z.string().min(1),
  category: z.enum(['PHOTO', 'DOCUMENT']),
  filename: z.string().min(1),
  imageBase64: z.string().min(1),
  gps: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number(),
    })
    .nullable()
    .optional(),
  note: z.string().optional(),
  timestamp: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid timestamp'),
});

const rejectSchema = z.object({
  reason: z.string().min(3),
});

const bulkApproveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

// In-memory attachment store (MVP — real file storage later)
const stubAttachments: Array<{
  id: string;
  employeeId: string;
  shiftId: string;
  category: 'PHOTO' | 'DOCUMENT';
  filename: string;
  note?: string;
  uploadedAt: string;
  documentUrl: string;
}> = [];

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
// GET / — paginated list with query filters
// ---------------------------------------------------------------------------
timesheetsRouter.get(
  '/',
  requireRole(
    Role.DRIVER,
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
    const parsed = timesheetQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      apiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid timesheet query parameters',
        parsed.error.flatten()
      );
      return;
    }

    const query = parsed.data;
    const scopedEmployeeId =
      req.user?.role === Role.DRIVER ? req.user.sub : query.employeeId;

    // Kimai passthrough if enabled
    if (KIMAI_INTEGRATION_ENABLED) {
      try {
        const data = await kimaiService.listTimesheets({
          ...(scopedEmployeeId ? { user: scopedEmployeeId } : {}),
          ...(query.startDate ? { begin: query.startDate } : {}),
          ...(query.endDate ? { end: query.endDate } : {}),
          page: query.page,
          size: query.limit,
        });

        res.json({
          data,
          total: Array.isArray(data) ? data.length : 0,
          page: query.page,
          limit: query.limit,
          source: 'kimai',
        });
        return;
      } catch (error) {
        apiError(
          res,
          502,
          'KIMAI_UPSTREAM_ERROR',
          'Failed to fetch timesheets from Kimai',
          { message: (error as Error).message }
        );
        return;
      }
    }

    // Database query
    const result = await timesheetService.findByFilters({
      employeeId: scopedEmployeeId,
      status: query.status as any,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    res.json({
      data: result.data,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
      source: 'database',
    });
  }
);

// ---------------------------------------------------------------------------
// GET /active — currently clocked-in employees
// ---------------------------------------------------------------------------
timesheetsRouter.get(
  '/active',
  requireRole(
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (_req: Request, res: Response) => {
    const active = await timesheetService.findActive();
    res.json({ data: active, count: active.length });
  }
);

// ---------------------------------------------------------------------------
// GET /exceptions — flagged entries summary for manager review
// ---------------------------------------------------------------------------
timesheetsRouter.get(
  '/exceptions',
  requireRole(
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (_req: Request, res: Response) => {
    const exceptions = await timesheetService.getExceptions();
    res.json(exceptions);
  }
);

// ---------------------------------------------------------------------------
// POST /punch — clock in / out
// ---------------------------------------------------------------------------
timesheetsRouter.post(
  '/punch',
  requireRole(
    Role.DRIVER,
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
    const parsed = punchSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid clock punch payload',
        parsed.error.flatten()
      );
      return;
    }

    if (!req.user?.sub) {
      apiError(res, 401, 'AUTH_REQUIRED', 'User context is missing');
      return;
    }

    const punch = parsed.data as ClockPunchDto;
    const anomaly = await anomalyService.scorePunch({
      ...punch,
      employeeId: req.user.sub,
    });

    // Kimai passthrough if enabled
    if (KIMAI_INTEGRATION_ENABLED) {
      try {
        const created = await kimaiService.createTimesheet({
          begin: punch.timestamp,
          end: punch.type === 'OUT' ? punch.timestamp : undefined,
          user: req.user.sub,
          description: 'ServiceCore punch sync',
          tags: [punch.jobType ?? JobType.RESIDENTIAL_SANITATION],
        });

        res.status(201).json({ data: created, source: 'kimai' });
        return;
      } catch (error) {
        apiError(
          res,
          502,
          'KIMAI_UPSTREAM_ERROR',
          'Failed to create punch in Kimai',
          { message: (error as Error).message }
        );
        return;
      }
    }

    // Database: clock in creates new entry, clock out completes existing
    if (punch.type === 'IN') {
      const entry = await prisma.timeEntry.create({
        data: {
          employeeId: req.user.sub,
          clockIn: new Date(punch.timestamp),
          jobType: (punch.jobType ?? JobType.RESIDENTIAL_SANITATION) as any,
          gpsClockIn: punch.gps as any,
          photoUrl: punch.photoBase64 ? 'pending://upload' : null,
          anomalyScore: anomaly.score,
          anomalyFlags: anomaly.flags,
          status: anomaly.score >= 0.6 ? 'FLAGGED' : 'PENDING',
          notes: anomaly.flags.length > 0 ? `anomaly:${anomaly.flags.join(',')}` : null,
        },
        include: { employee: true },
      });

      res.status(201).json({ data: entry, anomaly, source: 'database' });
    } else {
      // Clock OUT — find the most recent open entry for this employee
      const openEntry = await prisma.timeEntry.findFirst({
        where: {
          employeeId: req.user.sub,
          clockOut: null,
          deletedAt: null,
        },
        orderBy: { clockIn: 'desc' },
      });

      if (!openEntry) {
        apiError(res, 404, 'NO_OPEN_ENTRY', 'No open clock-in found to close');
        return;
      }

      const clockOut = new Date(punch.timestamp);
      const hoursWorked = Math.max(
        0,
        (clockOut.getTime() - openEntry.clockIn.getTime()) / (1000 * 60 * 60)
      );

      // Use real overtime engine for accurate calculation
      const employee = await prisma.employee.findUnique({
        where: { id: req.user.sub },
        include: { payRates: true },
      });

      let regularHours = Math.min(hoursWorked, 8);
      let overtimeHours = Math.max(0, hoursWorked - 8);
      let doubleTimeHours = 0;

      if (employee && employee.payRates.length > 0) {
        // Get this week's entries for proper weekly OT calculation
        const weekStart = new Date(clockOut);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEntries = await prisma.timeEntry.findMany({
          where: {
            employeeId: req.user.sub,
            clockIn: { gte: weekStart },
            deletedAt: null,
            id: { not: openEntry.id },
          },
        });

        // Build the entry list including the one being closed
        const allEntries = [
          ...weekEntries.map((e) => ({
            id: e.id, employeeId: e.employeeId,
            clockIn: e.clockIn, clockOut: e.clockOut,
            jobType: e.jobType as any,
            gpsIn: null, gpsOut: null, photoInUrl: null, photoOutUrl: null,
            status: e.status as any, approvedById: e.approvedBy,
            approvedAt: e.approvedAt, flagReason: e.flagReason,
            notes: e.notes, createdAt: e.createdAt, updatedAt: e.updatedAt,
          })),
          {
            id: openEntry.id, employeeId: openEntry.employeeId,
            clockIn: openEntry.clockIn, clockOut: clockOut,
            jobType: openEntry.jobType as any,
            gpsIn: null, gpsOut: null, photoInUrl: null, photoOutUrl: null,
            status: 'SUBMITTED' as any, approvedById: null,
            approvedAt: null, flagReason: null,
            notes: null, createdAt: openEntry.createdAt, updatedAt: new Date(),
          },
        ];

        const otResult = overtimeService.calculateForEntries(
          req.user.sub,
          allEntries,
          employee.payRates.map((pr) => ({
            id: pr.id, employeeId: pr.employeeId,
            jobType: pr.jobType as any,
            ratePerHour: Number(pr.ratePerHour),
            effectiveFrom: pr.effectiveFrom,
            effectiveTo: pr.effectiveTo,
          })),
          {
            employeeClass: employee.employeeClass as any,
            stateCode: employee.stateCode,
            cbAgreementId: employee.cbAgreementId ?? undefined,
            isMotorCarrierExempt: employee.isMotorCarrier,
          }
        );

        // Attribute this entry's portion of weekly OT
        const priorHours = weekEntries.reduce((sum, e) => {
          if (!e.clockOut) return sum;
          return sum + (e.clockOut.getTime() - e.clockIn.getTime()) / (1000 * 60 * 60);
        }, 0);
        const totalWeeklyHours = priorHours + hoursWorked;

        if (totalWeeklyHours > 40) {
          const priorOT = Math.max(0, priorHours - 40);
          const totalOT = Math.max(0, totalWeeklyHours - 40);
          overtimeHours = totalOT - priorOT;
          regularHours = hoursWorked - overtimeHours;
        }

        doubleTimeHours = otResult.doubleTimeHours > 0
          ? Math.max(0, hoursWorked - regularHours - overtimeHours)
          : 0;
      }

      const entry = await prisma.timeEntry.update({
        where: { id: openEntry.id },
        data: {
          clockOut,
          gpsClockOut: punch.gps as any,
          hoursWorked,
          regularHours,
          overtimeHours,
          doubleTimeHours,
          status: 'SUBMITTED',
        },
        include: { employee: true },
      });

      res.status(200).json({ data: entry, anomaly, source: 'database' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /attachments — driver field photos and project documents
// ---------------------------------------------------------------------------
timesheetsRouter.post(
  '/attachments',
  requireRole(
    Role.DRIVER,
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
    const parsed = attachmentSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid attachment payload',
        parsed.error.flatten()
      );
      return;
    }

    if (!req.user?.sub) {
      apiError(res, 401, 'AUTH_REQUIRED', 'User context is missing');
      return;
    }

    const attachment = parsed.data;
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Write base64 image to disk
    const uploadDir = path.join(process.cwd(), 'uploads', attachment.shiftId);
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${id}-${attachment.filename}`);
    const buffer = Buffer.from(attachment.imageBase64, 'base64');
    await fs.writeFile(filePath, buffer);

    const record = {
      id,
      employeeId: req.user.sub,
      shiftId: attachment.shiftId,
      category: attachment.category,
      filename: attachment.filename,
      note: attachment.note,
      uploadedAt: attachment.timestamp,
      documentUrl: `/uploads/${attachment.shiftId}/${id}-${attachment.filename}`,
      sizeBytes: buffer.length,
    };

    res.status(201).json({
      data: record,
      source: 'filesystem',
    });
  }
);

// ---------------------------------------------------------------------------
// POST /bulk-approve — approve multiple timesheets at once
// ---------------------------------------------------------------------------
timesheetsRouter.post(
  '/bulk-approve',
  requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.PAYROLL_ADMIN, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response) => {
    const parsed = bulkApproveSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(res, 400, 'VALIDATION_ERROR', 'Invalid bulk approve payload', parsed.error.flatten());
      return;
    }

    const result = await timesheetService.bulkApprove(
      parsed.data.ids,
      req.user?.sub ?? 'unknown'
    );

    res.json(result);
  }
);

// ---------------------------------------------------------------------------
// PATCH /:id/approve — manager approval
// ---------------------------------------------------------------------------
timesheetsRouter.patch(
  '/:id/approve',
  requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.PAYROLL_ADMIN, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const approvedBy = req.user?.sub ?? 'unknown';

    try {
      const entry = await timesheetService.approve(id, approvedBy);

      // Best-effort notification
      if (entry.employeeId) {
        const employee = await prisma.employee.findUnique({ where: { id: entry.employeeId } });
        if (employee?.email) {
          await notificationService.sendEmail(
            employee.email,
            `Timesheet ${id} approved`,
            `Your timesheet for ${entry.clockIn.toLocaleDateString()} was approved.`
          );
        }
      }

      res.json({
        data: entry,
        message: `Timesheet ${id} approved`,
      });
    } catch (err) {
      apiError(res, 404, 'NOT_FOUND', `Timesheet ${id} not found`);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /:id/reject — manager rejection with reason
// ---------------------------------------------------------------------------
timesheetsRouter.patch(
  '/:id/reject',
  requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.PAYROLL_ADMIN, Role.SYSTEM_ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(
        res,
        400,
        'VALIDATION_ERROR',
        'A rejection reason is required',
        parsed.error.flatten()
      );
      return;
    }

    const { reason } = parsed.data;
    const rejectedBy = req.user?.sub ?? 'unknown';

    try {
      const entry = await timesheetService.reject(id, reason, rejectedBy);

      // Best-effort notification
      if (entry.employeeId) {
        const employee = await prisma.employee.findUnique({ where: { id: entry.employeeId } });
        if (employee?.email) {
          await notificationService.sendEmail(
            employee.email,
            `Timesheet ${id} rejected`,
            `Your timesheet was rejected for reason: ${reason}`
          );
        }
      }

      res.json({
        data: entry,
        message: `Timesheet ${id} rejected`,
      });
    } catch (err) {
      apiError(res, 404, 'NOT_FOUND', `Timesheet ${id} not found`);
    }
  }
);
