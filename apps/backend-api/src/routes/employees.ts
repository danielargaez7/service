import { Router, Request, Response } from 'express';
import { Role } from '@servicecore/shared-models';
import { requireRole, requireSelfOrRole } from '../middleware/rbac.middleware';
import { calculateHOSStatus, type HOSDutyEntry } from '@servicecore/hos-engine';
import prisma from '../prisma';

export const employeesRouter = Router();

// ---------------------------------------------------------------------------
// GET / — list employees (RBAC filtered)
// ---------------------------------------------------------------------------
employeesRouter.get(
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
    const role = req.user?.role;

    const where: any = { deletedAt: null };

    // Drivers only see themselves
    if (role === Role.DRIVER) {
      where.id = req.user?.sub;
    }
    // Route managers see their reports + self
    else if (role === Role.ROUTE_MANAGER) {
      where.OR = [
        { id: req.user?.sub },
        { managerId: req.user?.sub },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { lastName: 'asc' },
    });

    res.json({ data: employees, total: employees.length });
  }
);

// ---------------------------------------------------------------------------
// GET /:id — single employee
// ---------------------------------------------------------------------------
employeesRouter.get(
  '/:id',
  requireSelfOrRole(
    (req) => req.params.id,
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
    const emp = await prisma.employee.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { payRates: true, certifications: true },
    });

    if (!emp) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json(emp);
  }
);

// ---------------------------------------------------------------------------
// GET /:id/hos — HOS status for a driver (real calculation)
// ---------------------------------------------------------------------------
employeesRouter.get(
  '/:id/hos',
  requireSelfOrRole(
    (req) => req.params.id,
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Get today's entries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get this week's entries (Sunday start)
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const now = new Date();

    const entries = await prisma.timeEntry.findMany({
      where: {
        employeeId: id,
        clockIn: { gte: weekStart },
        deletedAt: null,
      },
      orderBy: { clockIn: 'asc' },
    });

    const toDutyEntry = (e: typeof entries[0]): HOSDutyEntry => ({
      startTime: e.clockIn,
      endTime: e.clockOut ?? now,
      type: 'ON_DUTY',
    });

    const todayEntries = entries
      .filter((e) => e.clockIn >= todayStart)
      .map(toDutyEntry);

    const weekEntries = entries.map(toDutyEntry);

    const hosStatus = calculateHOSStatus(todayEntries, weekEntries);

    res.json({
      employeeId: id,
      ...hosStatus,
      isShortHaulExempt: false, // Could be calculated with geofence data
    });
  }
);
