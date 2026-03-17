import { JobType } from './timesheet.model';

export interface DashboardOverview {
  totalActiveWorkers: number;
  totalClockedInToday: number;
  todayLaborCost: number;
  unapprovedTimesheets: number;
  otHoursThisWeek: number;
  complianceRisks: number;
}

export interface OvertimeTrend {
  date: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  totalCost: number;
}

export interface LaborCostByJob {
  jobType: JobType;
  totalHours: number;
  totalCost: number;
  employeeCount: number;
}

export interface LaborCostByRoute {
  routeId: string;
  routeName: string;
  totalHours: number;
  totalCost: number;
  employeeCount: number;
}
