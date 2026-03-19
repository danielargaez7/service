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
    // Look up employee by email in the real database
    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (!employee) {
      res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      return;
    }

    // Verify password with bcrypt
    const passwordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      return;
    }

    // Build JWT
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: employee.id,
      role: employee.role as any,
      email: employee.email,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

    // Return employee data (without passwordHash)
    const { passwordHash: _, ...safeEmployee } = employee;
    const body: LoginResponse = {
      accessToken,
      refreshToken,
      employee: safeEmployee as any,
    };

    res.json(body);
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
