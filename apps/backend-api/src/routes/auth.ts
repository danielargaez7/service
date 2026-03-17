import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  LoginRequest,
  LoginResponse,
  TokenPayload,
  Role,
  EmployeeClass,
  Employee,
} from '@servicecore/shared-models';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL = '7d';
const DEMO_PASSWORDS = new Set(['demo', 'password']);

export const authRouter = Router();

// Demo accounts — use these credentials to log in
const DEMO_ACCOUNTS: Record<string, Employee> = {
  'admin@servicecore.com': {
    id: 'emp-admin',
    kimaiUserId: 200,
    timetrexId: null,
    firstName: 'Lisa',
    lastName: 'Chen',
    email: 'admin@servicecore.com',
    phone: '555-0100',
    role: Role.HR_ADMIN,
    employeeClass: EmployeeClass.OFFICE,
    stateCode: 'CO',
    isMotorCarrier: false,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
  'manager@servicecore.com': {
    id: 'emp-mgr',
    kimaiUserId: 100,
    timetrexId: null,
    firstName: 'Sarah',
    lastName: 'Palmer',
    email: 'manager@servicecore.com',
    phone: '555-0101',
    role: Role.ROUTE_MANAGER,
    employeeClass: EmployeeClass.NON_CDL,
    stateCode: 'CO',
    isMotorCarrier: false,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
  'driver@servicecore.com': {
    id: 'emp-001',
    kimaiUserId: 1,
    timetrexId: null,
    firstName: 'Marcus',
    lastName: 'Rivera',
    email: 'driver@servicecore.com',
    phone: '555-0102',
    role: Role.DRIVER,
    employeeClass: EmployeeClass.CDL_A,
    stateCode: 'CO',
    isMotorCarrier: true,
    cbAgreementId: null,
    managerId: 'emp-mgr',
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
  'payroll@servicecore.com': {
    id: 'emp-payroll',
    kimaiUserId: 205,
    timetrexId: null,
    firstName: 'Noah',
    lastName: 'Bennett',
    email: 'payroll@servicecore.com',
    phone: '555-0104',
    role: Role.PAYROLL_ADMIN,
    employeeClass: EmployeeClass.OFFICE,
    stateCode: 'CO',
    isMotorCarrier: false,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
  'exec@servicecore.com': {
    id: 'emp-exec',
    kimaiUserId: 204,
    timetrexId: null,
    firstName: 'Rachel',
    lastName: 'Adams',
    email: 'exec@servicecore.com',
    phone: '555-0103',
    role: Role.EXECUTIVE,
    employeeClass: EmployeeClass.OFFICE,
    stateCode: 'CO',
    isMotorCarrier: false,
    cbAgreementId: null,
    managerId: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-06-01'),
  },
};

// -------------------------------------------------------
// POST /login
// -------------------------------------------------------
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  if (!DEMO_PASSWORDS.has(password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const employee = DEMO_ACCOUNTS[email.toLowerCase()];
  if (!employee) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: employee.id,
    role: employee.role,
    email: employee.email,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  const body: LoginResponse = {
    accessToken,
    refreshToken,
    employee,
  };

  res.json(body);
});

// -------------------------------------------------------
// POST /refresh
// -------------------------------------------------------
authRouter.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload;

    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };

    const newAccessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });
    const newRefreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_TTL,
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// -------------------------------------------------------
// POST /logout
// -------------------------------------------------------
authRouter.post('/logout', (_req: Request, res: Response) => {
  // In a real implementation this would invalidate the refresh token in a
  // blocklist / database. For the stub we simply acknowledge.
  res.json({ message: 'Logged out successfully' });
});
