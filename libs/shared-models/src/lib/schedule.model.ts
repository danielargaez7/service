import { JobType } from './timesheet.model';

export interface Schedule {
  id: string;
  employeeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  jobType: JobType;
  routeId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduleDto {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  jobType: JobType;
  routeId?: string;
  notes?: string;
}
