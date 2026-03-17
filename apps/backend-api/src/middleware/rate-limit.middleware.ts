import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const authLoginRateLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: toPositiveInt(process.env.RATE_LIMIT_AUTH_LOGIN_MAX, 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message:
        'Too many login attempts. Please wait a few minutes and try again.',
    },
  },
});

export const authRefreshRateLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: toPositiveInt(process.env.RATE_LIMIT_AUTH_REFRESH_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many token refresh attempts. Please try again later.',
    },
  },
});

export const aiRateLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: toPositiveInt(process.env.RATE_LIMIT_AI_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'AI request rate limit exceeded. Please retry shortly.',
    },
  },
});
