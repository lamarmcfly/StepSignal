import { Request, Response, NextFunction } from 'express';

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.session.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden: Admin access required',
      requiredRole: 'admin',
      currentRole: req.session.role,
    });
  }

  next();
}

/**
 * Require advisor or admin role
 */
export function requireAdvisor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.session.role !== 'advisor' && req.session.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden: Advisor or admin access required',
      requiredRoles: ['advisor', 'admin'],
      currentRole: req.session.role,
    });
  }

  next();
}

/**
 * Require student role (or admin for testing/debugging)
 */
export function requireStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.session.role !== 'student' && req.session.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden: Student access required',
      requiredRoles: ['student', 'admin'],
      currentRole: req.session.role,
    });
  }

  next();
}

/**
 * Check if user has any of the specified roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        requiredRoles: allowedRoles,
        currentRole: req.session.role,
      });
    }

    next();
  };
}
