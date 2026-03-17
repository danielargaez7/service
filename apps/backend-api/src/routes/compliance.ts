import { Router, Request, Response } from 'express';
import {
  ComplianceRisk,
  Certification,
  CertificationType,
} from '@servicecore/shared-models';

export const complianceRouter = Router();

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
const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

complianceRouter.get('/risks', (_req: Request, res: Response) => {
  const sorted = [...stubRisks].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
  res.json({ data: sorted, total: sorted.length });
});

// ---------------------------------------------------------------------------
// GET /certifications — list certifications with filters
// ---------------------------------------------------------------------------
complianceRouter.get('/certifications', (req: Request, res: Response) => {
  const { employeeId, type } = req.query as Record<string, string>;

  let filtered = [...stubCerts];
  if (employeeId) {
    filtered = filtered.filter((c) => c.employeeId === employeeId);
  }
  if (type) {
    filtered = filtered.filter((c) => c.type === type);
  }

  res.json({ data: filtered, total: filtered.length });
});

// ---------------------------------------------------------------------------
// GET /certifications/expiring — expiring within N days
// ---------------------------------------------------------------------------
complianceRouter.get(
  '/certifications/expiring',
  (req: Request, res: Response) => {
    const days = parseInt((req.query.days as string) ?? '30', 10);
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const expiring = stubCerts.filter(
      (c) => c.expiryDate <= cutoff && c.expiryDate >= now
    );

    res.json({ data: expiring, total: expiring.length, withinDays: days });
  }
);
