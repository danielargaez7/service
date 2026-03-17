import { Router, Request, Response } from 'express';
import {
  TimeEntry,
  TimesheetStatus,
  JobType,
  ClockPunchDto,
} from '@servicecore/shared-models';

export const timesheetsRouter = Router();

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

// ---------------------------------------------------------------------------
// GET / — paginated list with query filters
// ---------------------------------------------------------------------------
timesheetsRouter.get('/', (req: Request, res: Response) => {
  const {
    employeeId,
    status,
    startDate,
    endDate,
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  let filtered = [...stubEntries];

  if (employeeId) {
    filtered = filtered.filter((e) => e.employeeId === employeeId);
  }
  if (status) {
    filtered = filtered.filter((e) => e.status === status);
  }
  if (startDate) {
    const sd = new Date(startDate);
    filtered = filtered.filter((e) => e.clockIn >= sd);
  }
  if (endDate) {
    const ed = new Date(endDate);
    filtered = filtered.filter((e) => e.clockIn <= ed);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const start = (pageNum - 1) * limitNum;

  res.json({
    data: filtered.slice(start, start + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

// ---------------------------------------------------------------------------
// GET /active — currently clocked-in employees
// ---------------------------------------------------------------------------
timesheetsRouter.get('/active', (_req: Request, res: Response) => {
  const active = stubEntries.filter((e) => e.clockOut === null);
  res.json({ data: active, count: active.length });
});

// ---------------------------------------------------------------------------
// POST /punch — clock in / out
// ---------------------------------------------------------------------------
timesheetsRouter.post('/punch', (req: Request, res: Response) => {
  const punch = req.body as ClockPunchDto;

  if (!punch.type || !punch.timestamp || !punch.gps) {
    res
      .status(400)
      .json({ error: 'type, timestamp, and gps are required' });
    return;
  }

  const newEntry: TimeEntry = {
    id: `ts-${Date.now()}`,
    employeeId: req.user?.sub ?? 'unknown',
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
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  res.status(201).json(newEntry);
});

// ---------------------------------------------------------------------------
// PATCH /:id/approve — manager approval
// ---------------------------------------------------------------------------
timesheetsRouter.patch('/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;

  res.json({
    id,
    status: TimesheetStatus.APPROVED,
    approvedById: req.user?.sub ?? 'manager-001',
    approvedAt: new Date(),
    message: `Timesheet ${id} approved`,
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id/reject — manager rejection with reason
// ---------------------------------------------------------------------------
timesheetsRouter.patch('/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  if (!reason) {
    res.status(400).json({ error: 'reason is required for rejection' });
    return;
  }

  res.json({
    id,
    status: TimesheetStatus.REJECTED,
    flagReason: reason,
    message: `Timesheet ${id} rejected`,
  });
});
