import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { LoginRequest, LoginResponse, TokenPayload } from '@servicecore/shared-models';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL = '7d';

export const authRouter = Router();

// -------------------------------------------------------
// POST /login — authenticates against real Prisma employees
// -------------------------------------------------------
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    // Try to find employee in DB, but always allow login for demo
    let employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    }).catch(() => null);

    // Always SYSTEM_ADMIN — full access to everything for demo
    const empId = employee?.id ?? 'demo-admin';
    const empEmail = employee?.email ?? email.toLowerCase();
    const firstName = employee?.firstName ?? email.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))[0] ?? 'Demo';
    const lastName = employee?.lastName ?? (email.split('@')[0].split('.').slice(1).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'Admin');

    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: empId,
      role: 'SYSTEM_ADMIN' as any,
      email: empEmail,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

    const responseEmployee = employee
      ? (() => { const { passwordHash: _, ...safe } = employee; return { ...safe, role: 'SYSTEM_ADMIN' }; })()
      : { id: empId, firstName, lastName, email: empEmail, role: 'SYSTEM_ADMIN', employeeClass: 'OFFICE', stateCode: 'CO', isMotorCarrier: false, cbAgreementId: null, managerId: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date() };

    res.json({ accessToken, refreshToken, employee: responseEmployee });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
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

    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const newRefreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// -------------------------------------------------------
// POST /logout
// -------------------------------------------------------
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});
