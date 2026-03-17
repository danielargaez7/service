export interface OvertimeInput {
  employeeId: string;
  entries: OTTimeEntry[];
  payRates: OTPayRate[];
  employeeClass: string;
  stateCode: string;
  cbAgreementId?: string;
  isMotorCarrierExempt: boolean;
}

export interface OTTimeEntry {
  id: string;
  clockIn: Date;
  clockOut: Date;
  hoursWorked: number;
  jobType: string;
}

export interface OTPayRate {
  jobType: string;
  ratePerHour: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
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

export interface DailyHours {
  date: string; // YYYY-MM-DD
  totalHours: number;
  entries: OTTimeEntry[];
}

export interface StateOvertimeRule {
  stateCode: string;
  dailyOTThreshold: number | null; // hours after which daily OT kicks in (null = no daily OT)
  dailyDTThreshold: number | null; // hours after which daily double-time kicks in
  weeklyOTThreshold: number; // defaults to 40 for most states
  seventhDayRule: boolean; // California: 7th consecutive day in workweek
}
