import express, { Router } from 'express';
import { prisma } from '@stepsignal/database';
import { registerSchema, loginSchema } from '@stepsignal/shared';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password, role, institutionId } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email_institutionId: {
          email,
          institutionId,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Verify institution exists
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        institutionId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        institutionId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create session
    req.session.userId = user.id;
    req.session.user = user;

    return res.status(201).json({ user });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { email, password, institutionId } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email_institutionId: {
          email,
          institutionId,
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.json({
      user: req.session.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: express.Request, res: express.Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: express.Request, res: express.Response) => {
  return res.json({ user: req.session.user });
});

// GET /api/auth/admin-test (Admin only)
router.get('/admin-test', requireAuth, requireRole('admin'), (req: express.Request, res: express.Response) => {
  return res.json({ message: 'Admin access granted', user: req.session.user });
});

export default router;
