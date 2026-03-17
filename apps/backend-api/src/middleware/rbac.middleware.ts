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

/**
 * Allows a user to access their own resource, or lets privileged roles
 * access it on behalf of others.
 */
export function requireSelfOrRole(
  getSubjectId: (req: Request) => string | undefined,
  ...roles: string[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const subjectId = getSubjectId(req);

    if (userId && subjectId && userId === subjectId) {
      next();
      return;
    }

    if (userRole && roles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden — insufficient role',
      requiredRoles: roles,
      currentRole: userRole ?? null,
      subjectId: subjectId ?? null,
    });
  };
}
