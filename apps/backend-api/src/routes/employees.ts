import { Router, Request, Response } from 'express';
import {
  Employee,
  Role,
  EmployeeClass,
  HOSStatus,
} from '@servicecore/shared-models';

export const employeesRouter = Router();

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------
const stubEmployees: Employee[] = [
  {
    id: 'emp-001',
    kimaiUserId: null,
    timetrexId: null,
    firstName: 'Jane',
    lastName: 'Foreman',
    email: 'jane@servicecore.io',
    phone: '555-0100',
    role: Role.ROUTE_MANAGER,
    employeeClass: EmployeeClass.CDL_A,
    stateCode: 'CA',
    isMotorCarrier: true,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
  {
    id: 'emp-002',
    kimaiUserId: null,
    timetrexId: null,
    firstName: 'Carlos',
    lastName: 'Rivera',
    email: 'carlos@servicecore.io',
    phone: '555-0101',
    role: Role.DRIVER,
    employeeClass: EmployeeClass.CDL_B,
    stateCode: 'CA',
    isMotorCarrier: true,
    cbAgreementId: null,
    managerId: 'emp-001',
    deletedAt: null,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2025-08-20'),
  },
  {
    id: 'emp-003',
    kimaiUserId: null,
    timetrexId: null,
    firstName: 'Amy',
    lastName: 'Chen',
    email: 'amy@servicecore.io',
    phone: '555-0102',
    role: Role.HR_ADMIN,
    employeeClass: EmployeeClass.OFFICE,
    stateCode: 'CA',
    isMotorCarrier: false,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2025-05-15'),
  },
];

// ---------------------------------------------------------------------------
// GET / — list employees (RBAC filtered in a real impl)
// ---------------------------------------------------------------------------
employeesRouter.get('/', (req: Request, res: Response) => {
  // In production, filter by req.user.role — managers see their reports,
  // HR/admins see everyone, drivers see only themselves.
  const role = req.user?.role;
  let results = [...stubEmployees];

  if (role === Role.DRIVER) {
    results = results.filter((e) => e.id === req.user?.sub);
  }

  res.json({ data: results, total: results.length });
});

// ---------------------------------------------------------------------------
// GET /:id — single employee
// ---------------------------------------------------------------------------
employeesRouter.get('/:id', (req: Request, res: Response) => {
  const emp = stubEmployees.find((e) => e.id === req.params.id);

  if (!emp) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }

  res.json(emp);
});

// ---------------------------------------------------------------------------
// GET /:id/hos — HOS status for a driver
// ---------------------------------------------------------------------------
employeesRouter.get('/:id/hos', (req: Request, res: Response) => {
  const { id } = req.params;

  const hosStatus: HOSStatus = {
    employeeId: id,
    drivingHoursToday: 6.5,
    onDutyHoursToday: 8.0,
    hoursAvailableToday: 3.0,
    weeklyHoursUsed: 42.5,
    weeklyHoursRemaining: 17.5,
    isShortHaulExempt: false,
    violations: [],
  };

  res.json(hosStatus);
});
