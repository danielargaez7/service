import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@servicecore/shared-models';

export const scheduleRouter = Router();

// GET / — schedules by date range
scheduleRouter.get('/', requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.PAYROLL_ADMIN, Role.DISPATCHER, Role.SYSTEM_ADMIN), (_req: Request, res: Response) => {
  res.json({
    data: [
      {
        id: 'sched-1',
        employeeId: 'emp-1',
        employeeName: 'Marcus Rivera',
        date: '2026-03-16',
        startTime: '2026-03-16T06:00:00Z',
        endTime: '2026-03-16T14:30:00Z',
        routeId: 'route-south-1',
        jobType: 'RESIDENTIAL_SANITATION',
        notes: null,
      },
      {
        id: 'sched-2',
        employeeId: 'emp-2',
        employeeName: 'DeShawn Williams',
        date: '2026-03-16',
        startTime: '2026-03-16T07:00:00Z',
        endTime: '2026-03-16T15:30:00Z',
        routeId: 'route-north-1',
        jobType: 'ROLL_OFF_DELIVERY',
        notes: null,
      },
    ],
    total: 2,
  });
});

// POST / — create schedule
scheduleRouter.post('/', requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN), (req: Request, res: Response) => {
  res.status(201).json({
    id: 'sched-new',
    ...req.body,
    createdAt: new Date().toISOString(),
  });
});

// PATCH /:id — update schedule
scheduleRouter.patch('/:id', requireRole(Role.ROUTE_MANAGER, Role.HR_ADMIN, Role.SYSTEM_ADMIN), (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});
