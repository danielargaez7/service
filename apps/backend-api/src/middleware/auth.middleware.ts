import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenPayload } from '@servicecore/shared-models';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const SERVICECORE_API_KEY = process.env.SERVICECORE_API_KEY ?? '';
const REQUIRE_API_KEY = process.env.REQUIRE_API_KEY === 'true';

/**
 * Extend Express Request to include the decoded user payload.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts Bearer token from the Authorization header, verifies it, and
 * attaches the decoded payload to `req.user`.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function hasValidApiKey(req: Request): boolean {
  if (!SERVICECORE_API_KEY) return false;
  const headerValue = req.headers['x-api-key'];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!provided) return false;

  const expectedBuffer = Buffer.from(SERVICECORE_API_KEY);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Optional API key middleware for production hardening.
 * When REQUIRE_API_KEY=true, requests must include x-api-key.
 */
export function requireApiKeyIfConfigured(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!REQUIRE_API_KEY) {
    next();
    return;
  }

  if (!SERVICECORE_API_KEY) {
    res.status(500).json({ error: 'Server API key is not configured' });
    return;
  }

  if (!hasValidApiKey(req)) {
    res.status(401).json({ error: 'Missing or invalid API key' });
    return;
  }

  next();
}
