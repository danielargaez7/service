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

export const authRouter = Router();

// Stub employee returned on login
const stubEmployee: Employee = {
  id: 'emp-001',
  kimaiUserId: null,
  timetrexId: null,
  firstName: 'Jane',
  lastName: 'Foreman',
  email: 'jane@servicecore.io',
  phone: '555-0100',
  role: Role.ROUTE_MANAGER,
  employeeClass: EmployeeClass.CDL_A,
  stateCode: 'CA',
  isMotorCarrier: true,
  cbAgreementId: null,
  managerId: null,
  deletedAt: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2025-06-01'),
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

  // Stub: accept any credentials
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: stubEmployee.id,
    role: stubEmployee.role,
    email: stubEmployee.email,
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
    employee: stubEmployee,
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
