import type express from 'express';
import { Router } from 'express';
import { prisma } from '@stepsignal/database';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recalculateAndSaveRiskProfile } from '../services/riskAssessment.js';

const router = Router();

// List all assessments for a student
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = '1', limit = '20', type } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Check authorization
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Students can only view their own assessments, advisors/admins can view any in their institution
    if (
      req.session.user!.role === 'student' &&
      student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const where: any = { studentId };
    if (type) {
      where.type = type;
    }

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: {
          errorEvents: {
            select: {
              id: true,
              errorType: true,
              system: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          dateTaken: 'desc',
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    return res.json({
      assessments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error listing assessments:', error);
    return res.status(500).json({ error: 'Failed to list assessments' });
  }
});

// Get a single assessment by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        errorEvents: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Check authorization
    if (
      req.session.user!.role === 'student' &&
      assessment.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (assessment.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ assessment });
  } catch (error) {
    console.error('Error getting assessment:', error);
    return res.status(500).json({ error: 'Failed to get assessment' });
  }
});

// Create a new assessment
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      studentId,
      type,
      name,
      dateTaken,
      score,
      percentCorrect,
      totalQuestions,
      notes,
      metadata = {},
      errorEvents = [],
    } = req.body;

    if (!studentId || !type || !name || !dateTaken) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, type, name, dateTaken',
      });
    }

    // Check student exists and user has permission
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Students can only create their own assessments, advisors/admins can create for any in their institution
    if (
      req.session.user!.role === 'student' &&
      student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create assessment with error events in a transaction
    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        type,
        name,
        dateTaken: new Date(dateTaken),
        score: score ? parseFloat(score) : null,
        percentCorrect: percentCorrect ? parseFloat(percentCorrect) : null,
        totalQuestions: totalQuestions ? parseInt(totalQuestions) : null,
        notes,
        metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
        errorEvents: {
          create: errorEvents.map((event: any) => ({
            errorType: event.errorType,
            system: event.system,
            topic: event.topic || null,
            questionRef: event.questionRef || null,
            reflection: event.reflection || null,
            tags: event.tags || [],
          })),
        },
      },
      include: {
        errorEvents: true,
      },
    });

    // Recalculate risk profile after adding new assessment
    await recalculateAndSaveRiskProfile(studentId).catch((error) => {
      console.error('Failed to recalculate risk profile:', error);
      // Don't fail the request if risk calculation fails
    });

    return res.status(201).json({ assessment });
  } catch (error) {
    console.error('Error creating assessment:', error);
    return res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// Update an assessment
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, score, percentCorrect, totalQuestions, notes, metadata } = req.body;

    // Check assessment exists and user has permission
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Students can only update their own assessments, advisors/admins can update any in their institution
    if (
      req.session.user!.role === 'student' &&
      existingAssessment.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existingAssessment.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (score !== undefined) updateData.score = score ? parseFloat(score) : null;
    if (percentCorrect !== undefined) updateData.percentCorrect = percentCorrect ? parseFloat(percentCorrect) : null;
    if (totalQuestions !== undefined) updateData.totalQuestions = totalQuestions ? parseInt(totalQuestions) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (metadata !== undefined) updateData.metadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

    const assessment = await prisma.assessment.update({
      where: { id },
      data: updateData,
      include: {
        errorEvents: true,
      },
    });

    return res.json({ assessment });
  } catch (error) {
    console.error('Error updating assessment:', error);
    return res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// Delete an assessment
router.delete('/:id', requireAuth, requireRole('advisor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check assessment exists and belongs to same institution
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (existingAssessment.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete assessment (cascade will delete error events)
    await prisma.assessment.delete({
      where: { id },
    });

    return res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// Add an error event to an assessment
router.post('/:id/errors', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { errorType, system, topic, questionRef, reflection, tags = [] } = req.body;

    if (!errorType || !system) {
      return res.status(400).json({ error: 'Missing required fields: errorType, system' });
    }

    // Check assessment exists and user has permission
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (
      req.session.user!.role === 'student' &&
      assessment.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (assessment.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const errorEvent = await prisma.errorEvent.create({
      data: {
        assessmentId: id,
        errorType,
        system,
        topic: topic || null,
        questionRef: questionRef || null,
        reflection: reflection || null,
        tags: tags || [],
      },
    });

    return res.status(201).json({ errorEvent });
  } catch (error) {
    console.error('Error creating error event:', error);
    return res.status(500).json({ error: 'Failed to create error event' });
  }
});

export default router;
