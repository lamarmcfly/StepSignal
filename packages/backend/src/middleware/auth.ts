import express from 'express';
import { prisma } from '@stepsignal/database';

export async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        institutionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.session.user = user;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}
