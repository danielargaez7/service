export enum CertificationType {
  CDL_CLASS_A = 'CDL_CLASS_A',
  CDL_CLASS_B = 'CDL_CLASS_B',
  DOT_PHYSICAL = 'DOT_PHYSICAL',
  HAZWOPER_8HR = 'HAZWOPER_8HR',
  HAZWOPER_40HR = 'HAZWOPER_40HR',
  DRUG_TEST = 'DRUG_TEST',
  BACKGROUND_CHECK = 'BACKGROUND_CHECK',
  TANKER_ENDORSEMENT = 'TANKER_ENDORSEMENT',
  HAZMAT_ENDORSEMENT = 'HAZMAT_ENDORSEMENT',
}

export interface Certification {
  id: string;
  employeeId: string;
  type: CertificationType;
  issuedDate: Date;
  expiryDate: Date;
  documentUrl: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplianceRiskType =
  | 'CDL_EXPIRED'
  | 'CDL_EXPIRING'
  | 'DOT_PHYSICAL_EXPIRED'
  | 'HOS_WARNING'
  | 'HAZWOPER_EXPIRED';

export type ComplianceSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ComplianceRisk {
  id: string;
  employeeId: string;
  employeeName: string;
  type: ComplianceRiskType;
  severity: ComplianceSeverity;
  details: string;
  expiryDate?: Date;
  hoursRemaining?: number;
}

export interface HOSViolation {
  rule: string;
  description: string;
  occurredAt: Date;
}

export interface HOSStatus {
  employeeId: string;
  drivingHoursToday: number;
  onDutyHoursToday: number;
  hoursAvailableToday: number;
  weeklyHoursUsed: number;
  weeklyHoursRemaining: number;
  isShortHaulExempt: boolean;
  violations: HOSViolation[];
}
