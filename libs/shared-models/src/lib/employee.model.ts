export enum Role {
  DRIVER = 'DRIVER',
  DISPATCHER = 'DISPATCHER',
  ROUTE_MANAGER = 'ROUTE_MANAGER',
  HR_ADMIN = 'HR_ADMIN',
  PAYROLL_ADMIN = 'PAYROLL_ADMIN',
  EXECUTIVE = 'EXECUTIVE',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
}

export enum EmployeeClass {
  CDL_A = 'CDL_A',
  CDL_B = 'CDL_B',
  NON_CDL = 'NON_CDL',
  OFFICE = 'OFFICE',
  YARD = 'YARD',
  TEMP_SEASONAL = 'TEMP_SEASONAL',
}

export interface Employee {
  id: string;
  kimaiUserId: number | null;
  timetrexId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  employeeClass: EmployeeClass;
  stateCode: string;
  isMotorCarrier: boolean;
  cbAgreementId: string | null;
  managerId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  kimaiUserId?: number;
  timetrexId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  employeeClass: EmployeeClass;
  stateCode: string;
  isMotorCarrier?: boolean;
  cbAgreementId?: string;
  managerId?: string;
}

export interface UpdateEmployeeDto {
  kimaiUserId?: number;
  timetrexId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: Role;
  employeeClass?: EmployeeClass;
  stateCode?: string;
  isMotorCarrier?: boolean;
  cbAgreementId?: string | null;
  managerId?: string | null;
}
