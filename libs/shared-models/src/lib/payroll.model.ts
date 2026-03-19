import { EmployeeClass } from './employee.model';
import { JobType } from './timesheet.model';
import { TimeEntry } from './timesheet.model';

export interface PayRate {
  id: string;
  employeeId: string;
  jobType: JobType;
  ratePerHour: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface OvertimeInput {
  employeeId: string;
  entries: TimeEntry[];
  payRates: PayRate[];
  employeeClass: EmployeeClass;
  stateCode: string;
  cbAgreementId?: string;
  isMotorCarrierExempt: boolean;
}

export interface OvertimeResult {
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularPay: number;
  overtimePay: number;
  doubleTimePay: number;
  totalPay: number;
  calculationMethod: string;
  warnings: string[];
}

export interface PayrollPreview {
  employeeId: string;
  employeeName: string;
  periodStart: Date;
  periodEnd: Date;
  entries: TimeEntry[];
  overtime: OvertimeResult;
  payRates: PayRate[];
}

export interface PayrollExportRequest {
  periodStart: string;
  periodEnd: string;
  employeeIds?: string[];
  format: 'CSV' | 'ADP' | 'GUSTO' | 'QUICKBOOKS' | 'JSON' | 'TIMETRIX';
}
