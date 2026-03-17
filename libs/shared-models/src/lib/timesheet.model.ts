export enum JobType {
  RESIDENTIAL_SANITATION = 'RESIDENTIAL_SANITATION',
  ROLL_OFF_DELIVERY = 'ROLL_OFF_DELIVERY',
  ROLL_OFF_PICKUP = 'ROLL_OFF_PICKUP',
  SEPTIC_PUMP = 'SEPTIC_PUMP',
  GREASE_TRAP = 'GREASE_TRAP',
  EMERGENCY_SEPTIC = 'EMERGENCY_SEPTIC',
  YARD_MAINTENANCE = 'YARD_MAINTENANCE',
  OFFICE = 'OFFICE',
  TRAINING = 'TRAINING',
  TRAVEL = 'TRAVEL',
}

export enum TimesheetStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
  EXPORTED = 'EXPORTED',
}

export interface GpsCoordinate {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut: Date | null;
  jobType: JobType;
  gpsIn: GpsCoordinate | null;
  gpsOut: GpsCoordinate | null;
  photoInUrl: string | null;
  photoOutUrl: string | null;
  status: TimesheetStatus;
  approvedById: string | null;
  approvedAt: Date | null;
  flagReason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClockPunchDto {
  type: 'IN' | 'OUT';
  timestamp: string;
  gps: GpsCoordinate;
  jobType?: JobType;
  photoBase64?: string;
}

export interface QueuedPunch {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  gps: GpsCoordinate;
  jobType: JobType;
  photoBase64?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}
