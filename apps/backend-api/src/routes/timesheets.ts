import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  TimeEntry,
  TimesheetStatus,
  JobType,
  ClockPunchDto,
  Role,
} from '@servicecore/shared-models';
import { requireRole } from '../middleware/rbac.middleware';
import { KimaiService } from '../services/kimai.service';
import { AnomalyService } from '../services/anomaly.service';
import { NotificationService } from '../services/notification.service';

export const timesheetsRouter = Router();
const kimaiService = new KimaiService();
const anomalyService = new AnomalyService();
const notificationService = new NotificationService();
const KIMAI_INTEGRATION_ENABLED =
  process.env.KIMAI_INTEGRATION_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------
const stubEntries: TimeEntry[] = [
  {
    id: 'ts-001',
    employeeId: 'emp-001',
    clockIn: new Date('2026-03-16T06:00:00Z'),
    clockOut: new Date('2026-03-16T14:30:00Z'),
    jobType: JobType.RESIDENTIAL_SANITATION,
    gpsIn: { lat: 34.0522, lng: -118.2437, accuracy: 5 },
    gpsOut: { lat: 34.0525, lng: -118.244, accuracy: 4 },
    photoInUrl: null,
    photoOutUrl: null,
    status: TimesheetStatus.SUBMITTED,
    approvedById: null,
    approvedAt: null,
    flagReason: null,
    notes: 'Route 14 — residential pickup',
    createdAt: new Date('2026-03-16T06:00:00Z'),
    updatedAt: new Date('2026-03-16T14:30:00Z'),
  },
  {
    id: 'ts-002',
    employeeId: 'emp-002',
    clockIn: new Date('2026-03-16T07:00:00Z'),
    clockOut: null,
    jobType: JobType.SEPTIC_PUMP,
    gpsIn: { lat: 33.749, lng: -117.8677, accuracy: 8 },
    gpsOut: null,
    photoInUrl: null,
    photoOutUrl: null,
    status: TimesheetStatus.PENDING,
    approvedById: null,
    approvedAt: null,
    flagReason: null,
    notes: null,
    createdAt: new Date('2026-03-16T07:00:00Z'),
    updatedAt: new Date('2026-03-16T07:00:00Z'),
  },
];

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

const rejectSchema = z.object({
  reason: z.string().min(3),
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

  let filtered = [...stubEntries];

  if (scopedEmployeeId) {
    filtered = filtered.filter((entry) => entry.employeeId === scopedEmployeeId);
  }
  if (query.status) {
    filtered = filtered.filter((entry) => entry.status === query.status);
  }
  if (query.startDate) {
    const sd = new Date(query.startDate);
    filtered = filtered.filter((entry) => entry.clockIn >= sd);
  }
  if (query.endDate) {
    const ed = new Date(query.endDate);
    filtered = filtered.filter((entry) => entry.clockIn <= ed);
  }

  const start = (query.page - 1) * query.limit;

  res.json({
    data: filtered.slice(start, start + query.limit),
    total: filtered.length,
    page: query.page,
    limit: query.limit,
    source: 'stub',
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
  (_req: Request, res: Response) => {
  const active = stubEntries.filter((e) => e.clockOut === null);
  res.json({ data: active, count: active.length });
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

  const newEntry: TimeEntry = {
    id: `ts-${Date.now()}`,
    employeeId: req.user.sub,
    clockIn: new Date(punch.timestamp),
    clockOut: punch.type === 'OUT' ? new Date(punch.timestamp) : null,
    jobType: punch.jobType ?? JobType.RESIDENTIAL_SANITATION,
    gpsIn: punch.gps,
    gpsOut: punch.type === 'OUT' ? punch.gps : null,
    photoInUrl: punch.photoBase64 ? 'stub://photo-uploaded' : null,
    photoOutUrl: null,
    status: TimesheetStatus.PENDING,
    approvedById: null,
    approvedAt: null,
    flagReason: null,
    notes:
      anomaly.flags.length > 0
        ? `anomaly:${anomaly.flags.join(',')}`
        : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  res.status(201).json({
    data: newEntry,
    anomaly,
    source: 'stub',
  });
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
    const record = {
      id: `att-${Date.now()}`,
      employeeId: req.user.sub,
      shiftId: attachment.shiftId,
      category: attachment.category,
      filename: attachment.filename,
      note: attachment.note,
      uploadedAt: attachment.timestamp,
      documentUrl: `stub://shift-file/${attachment.shiftId}/${attachment.filename}`,
    };

    stubAttachments.unshift(record);

    res.status(201).json({
      data: record,
      source: 'stub',
    });
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

  const notify = await notificationService.sendEmail(
    'driver@servicecore.com',
    `Timesheet ${id} approved`,
    `Timesheet ${id} was approved by ${req.user?.sub ?? 'manager-001'}.`
  );

  res.json({
    id,
    status: TimesheetStatus.APPROVED,
    approvedById: req.user?.sub ?? 'manager-001',
    approvedAt: new Date(),
    notification: notify,
    message: `Timesheet ${id} approved`,
  });
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
    const notify = await notificationService.sendEmail(
      'driver@servicecore.com',
      `Timesheet ${id} rejected`,
      `Timesheet ${id} was rejected for reason: ${reason}`
    );

    res.json({
      id,
      status: TimesheetStatus.REJECTED,
      flagReason: reason,
      notification: notify,
      message: `Timesheet ${id} rejected`,
    });
  }
);
