import type express from 'express';
import { Router } from 'express';
import { prisma } from '@stepsignal/database';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// List all students (with pagination and filtering)
router.get('/', requireAuth, requireRole('advisor', 'admin'), async (req, res) => {
  try {
    const { page = '1', limit = '20', classYear, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      institutionId: req.session.user!.institutionId,
    };

    if (classYear) {
      where.classYear = parseInt(classYear as string);
    }

    if (search) {
      where.user = {
        email: {
          contains: search as string,
          mode: 'insensitive',
        },
      };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.student.count({ where }),
    ]);

    return res.json({
      students,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error listing students:', error);
    return res.status(500).json({ error: 'Failed to list students' });
  }
});

// Get a single student by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        exams: {
          include: {
            examType: true,
          },
          orderBy: {
            scheduledDate: 'asc',
          },
        },
        assessments: {
          orderBy: {
            dateTaken: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check authorization: students can view their own profile, advisors/admins can view any in their institution
    if (
      req.session.user!.role === 'student' &&
      student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ student });
  } catch (error) {
    console.error('Error getting student:', error);
    return res.status(500).json({ error: 'Failed to get student' });
  }
});

// Create a new student (advisor/admin only)
router.post('/', requireAuth, requireRole('advisor', 'admin'), async (req, res) => {
  try {
    const { email, password, classYear, hasAccommodations = false } = req.body;

    if (!email || !password || !classYear) {
      return res.status(400).json({ error: 'Missing required fields: email, password, classYear' });
    }

    // Check if user already exists with this email in the institution
    const existingUser = await prisma.user.findUnique({
      where: {
        email_institutionId: {
          email,
          institutionId: req.session.user!.institutionId,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'student',
          institutionId: req.session.user!.institutionId,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          institutionId: req.session.user!.institutionId,
          classYear: parseInt(classYear),
          hasAccommodations: Boolean(hasAccommodations),
        },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });

      return student;
    });

    return res.status(201).json({ student: result });
  } catch (error) {
    console.error('Error creating student:', error);
    return res.status(500).json({ error: 'Failed to create student' });
  }
});

// Update a student (advisor/admin only)
router.patch('/:id', requireAuth, requireRole('advisor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { classYear, hasAccommodations } = req.body;

    // Check student exists and belongs to same institution
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (existingStudent.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {};
    if (classYear !== undefined) {
      updateData.classYear = parseInt(classYear);
    }
    if (hasAccommodations !== undefined) {
      updateData.hasAccommodations = Boolean(hasAccommodations);
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({ student });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete a student (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check student exists and belongs to same institution
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (existingStudent.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete student and associated user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: existingStudent.userId },
    });

    return res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ error: 'Failed to delete student' });
  }
});

export default router;
