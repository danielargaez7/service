import { Request, Response, NextFunction } from 'express';

/**
 * Returns middleware that checks whether `req.user.role` is included in the
 * provided list of allowed roles. Returns 403 Forbidden if not.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden — insufficient role',
        requiredRoles: roles,
        currentRole: userRole ?? null,
      });
      return;
    }

    next();
  };
}
