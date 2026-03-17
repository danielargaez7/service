import { Employee, Role } from './employee.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  employee: Employee;
}

export interface TokenPayload {
  sub: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}
