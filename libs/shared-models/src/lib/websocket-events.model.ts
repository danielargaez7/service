import { GpsCoordinate, JobType } from './timesheet.model';
import { ComplianceRiskType, ComplianceSeverity } from './compliance.model';

export type WSEventType =
  | 'DRIVER_CLOCKED_IN'
  | 'DRIVER_CLOCKED_OUT'
  | 'GPS_UPDATE'
  | 'OT_THRESHOLD_CROSSED'
  | 'COMPLIANCE_ALERT'
  | 'TIMESHEET_SUBMITTED';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

export interface DriverClockedInPayload {
  employeeId: string;
  employeeName: string;
  jobType: JobType;
  gps: GpsCoordinate;
  clockInTime: string;
}

export interface DriverClockedOutPayload {
  employeeId: string;
  employeeName: string;
  jobType: JobType;
  gps: GpsCoordinate;
  clockOutTime: string;
  hoursWorked: number;
}

export interface GpsUpdatePayload {
  employeeId: string;
  gps: GpsCoordinate;
  timestamp: string;
}

export interface OtThresholdCrossedPayload {
  employeeId: string;
  employeeName: string;
  weeklyHours: number;
  threshold: number;
  estimatedOvertimeCost: number;
}

export interface ComplianceAlertPayload {
  employeeId: string;
  employeeName: string;
  riskType: ComplianceRiskType;
  severity: ComplianceSeverity;
  details: string;
}

export interface TimesheetSubmittedPayload {
  employeeId: string;
  employeeName: string;
  timesheetId: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
}
