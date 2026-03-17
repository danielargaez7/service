import { Router, Request, Response } from 'express';
import {
  ComplianceRisk,
  Certification,
  CertificationType,
  Role,
} from '@servicecore/shared-models';
import { ComplianceService } from '../services/compliance.service';
import { requireRole } from '../middleware/rbac.middleware';

export const complianceRouter = Router();
const complianceService = new ComplianceService();

// ---------------------------------------------------------------------------
// Stub data
// ---------------------------------------------------------------------------
const stubRisks: ComplianceRisk[] = [
  {
    id: 'risk-001',
    employeeId: 'emp-002',
    employeeName: 'Carlos Rivera',
    type: 'CDL_EXPIRING',
    severity: 'HIGH',
    details: 'CDL Class B expires in 12 days',
    expiryDate: new Date('2026-03-28'),
  },
  {
    id: 'risk-002',
    employeeId: 'emp-002',
    employeeName: 'Carlos Rivera',
    type: 'DOT_PHYSICAL_EXPIRED',
    severity: 'HIGH',
    details: 'DOT physical expired 2026-03-01',
    expiryDate: new Date('2026-03-01'),
  },
  {
    id: 'risk-003',
    employeeId: 'emp-004',
    employeeName: 'David Park',
    type: 'HOS_WARNING',
    severity: 'MEDIUM',
    details: 'Approaching 60-hour weekly limit — 2.5 h remaining',
    hoursRemaining: 2.5,
  },
];

const stubCerts: Certification[] = [
  {
    id: 'cert-001',
    employeeId: 'emp-002',
    type: CertificationType.CDL_CLASS_B,
    issuedDate: new Date('2023-03-28'),
    expiryDate: new Date('2026-03-28'),
    documentUrl: null,
    verified: true,
    createdAt: new Date('2023-03-28'),
    updatedAt: new Date('2023-03-28'),
  },
  {
    id: 'cert-002',
    employeeId: 'emp-002',
    type: CertificationType.DOT_PHYSICAL,
    issuedDate: new Date('2024-03-01'),
    expiryDate: new Date('2026-03-01'),
    documentUrl: null,
    verified: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01'),
  },
  {
    id: 'cert-003',
    employeeId: 'emp-001',
    type: CertificationType.CDL_CLASS_A,
    issuedDate: new Date('2022-06-15'),
    expiryDate: new Date('2027-06-15'),
    documentUrl: null,
    verified: true,
    createdAt: new Date('2022-06-15'),
    updatedAt: new Date('2022-06-15'),
  },
];

// ---------------------------------------------------------------------------
// GET /risks — all open compliance risks sorted by severity
// ---------------------------------------------------------------------------
complianceRouter.get(
  '/risks',
  requireRole(
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  (_req: Request, res: Response) => {
  const hosRisk = complianceService.buildHOSRiskIfNeeded(
    'emp-001',
    'Marcus Rivera',
    [
      {
        startTime: new Date('2026-03-16T06:00:00Z'),
        endTime: new Date('2026-03-16T12:30:00Z'),
        type: 'DRIVING',
      },
      {
        startTime: new Date('2026-03-16T12:30:00Z'),
        endTime: new Date('2026-03-16T14:00:00Z'),
        type: 'ON_DUTY',
      },
    ],
    [
      {
        startTime: new Date('2026-03-10T06:00:00Z'),
        endTime: new Date('2026-03-10T18:00:00Z'),
        type: 'ON_DUTY',
      },
      {
        startTime: new Date('2026-03-11T06:00:00Z'),
        endTime: new Date('2026-03-11T18:00:00Z'),
        type: 'ON_DUTY',
      },
      {
        startTime: new Date('2026-03-12T06:00:00Z'),
        endTime: new Date('2026-03-12T18:00:00Z'),
        type: 'ON_DUTY',
      },
      {
        startTime: new Date('2026-03-13T06:00:00Z'),
        endTime: new Date('2026-03-13T18:00:00Z'),
        type: 'ON_DUTY',
      },
      {
        startTime: new Date('2026-03-14T06:00:00Z'),
        endTime: new Date('2026-03-14T18:00:00Z'),
        type: 'ON_DUTY',
      },
      {
        startTime: new Date('2026-03-15T06:00:00Z'),
        endTime: new Date('2026-03-15T16:00:00Z'),
        type: 'ON_DUTY',
      },
    ]
  );
  const sorted = complianceService.sortRisksBySeverity(
    hosRisk ? [...stubRisks, hosRisk] : stubRisks
  );
  res.json({ data: sorted, total: sorted.length });
  }
);

// ---------------------------------------------------------------------------
// GET /certifications — list certifications with filters
// ---------------------------------------------------------------------------
complianceRouter.get(
  '/certifications',
  requireRole(
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  (req: Request, res: Response) => {
  const { employeeId, type } = req.query as Record<string, string>;

  let filtered = [...stubCerts];
  if (employeeId) {
    filtered = filtered.filter((c) => c.employeeId === employeeId);
  }
  if (type) {
    filtered = filtered.filter((c) => c.type === type);
  }

  res.json({ data: filtered, total: filtered.length });
  }
);

// ---------------------------------------------------------------------------
// GET /certifications/expiring — expiring within N days
// ---------------------------------------------------------------------------
complianceRouter.get(
  '/certifications/expiring',
  requireRole(
    Role.DISPATCHER,
    Role.ROUTE_MANAGER,
    Role.HR_ADMIN,
    Role.PAYROLL_ADMIN,
    Role.SYSTEM_ADMIN
  ),
  (req: Request, res: Response) => {
    const days = parseInt((req.query.days as string) ?? '30', 10);
    const expiring = complianceService.getExpiringCertifications(stubCerts, days);

    res.json({ data: expiring, total: expiring.length, withinDays: days });
  }
);
