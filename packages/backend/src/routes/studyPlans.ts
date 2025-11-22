import { Router } from 'express';
import { prisma } from '@stepsignal/database';
import { requireAuth } from '../middleware/auth.js';
import { generateStudyPlan, simulatePlanAdjustment } from '../services/studyPlanGenerator.js';

const router = Router();

// List all study plans for a student
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check authorization
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Students can only view their own plans, advisors/admins can view any in their institution
    if (
      req.session.user!.role === 'student' &&
      student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const studyPlans = await prisma.studyPlan.findMany({
      where: { studentId },
      include: {
        items: {
          orderBy: {
            weekNumber: 'asc',
          },
          include: {
            exam: {
              include: {
                examType: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({ studyPlans });
  } catch (error) {
    console.error('Error listing study plans:', error);
    return res.status(500).json({ error: 'Failed to list study plans' });
  }
});

// Get a specific study plan
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        student: true,
        items: {
          orderBy: {
            weekNumber: 'asc',
          },
          include: {
            exam: {
              include: {
                examType: true,
              },
            },
          },
        },
      },
    });

    if (!studyPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    // Check authorization
    if (
      req.session.user!.role === 'student' &&
      studyPlan.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (studyPlan.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ studyPlan });
  } catch (error) {
    console.error('Error getting study plan:', error);
    return res.status(500).json({ error: 'Failed to get study plan' });
  }
});

// Generate a new study plan
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      studentId,
      weeklyHoursAvailable,
      dailyHoursCap,
      startDate,
      title,
    } = req.body;

    if (!studentId || !weeklyHoursAvailable || !startDate) {
      return res.status(400).json({
        error: 'Missing required fields: studentId, weeklyHoursAvailable, startDate',
      });
    }

    // Check student exists and user has permission
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Students can create their own plans, advisors/admins can create for any in their institution
    if (
      req.session.user!.role === 'student' &&
      student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Generate the study plan
    const studyPlan = await generateStudyPlan({
      studentId,
      weeklyHoursAvailable: parseFloat(weeklyHoursAvailable),
      dailyHoursCap: dailyHoursCap ? parseFloat(dailyHoursCap) : undefined,
      startDate: new Date(startDate),
      title,
    });

    return res.status(201).json({ studyPlan });
  } catch (error: any) {
    console.error('Error generating study plan:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate study plan' });
  }
});

// Update study plan (status, settings)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, weeklyHoursAvailable, dailyHoursCap, title, description } = req.body;

    // Check plan exists and user has permission
    const existingPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    // Students can update their own plans, advisors/admins can update any in their institution
    if (
      req.session.user!.role === 'student' &&
      existingPlan.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existingPlan.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'active') {
        updateData.activatedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (weeklyHoursAvailable !== undefined) {
      updateData.weeklyHoursAvailable = parseFloat(weeklyHoursAvailable);
    }
    if (dailyHoursCap !== undefined) {
      updateData.dailyHoursCap = parseFloat(dailyHoursCap);
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const studyPlan = await prisma.studyPlan.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: {
            weekNumber: 'asc',
          },
          include: {
            exam: {
              include: {
                examType: true,
              },
            },
          },
        },
      },
    });

    return res.json({ studyPlan });
  } catch (error) {
    console.error('Error updating study plan:', error);
    return res.status(500).json({ error: 'Failed to update study plan' });
  }
});

// Update weekly plan item progress
router.patch('/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { completedHours, completedQuestions, isCompleted } = req.body;

    // Check plan exists and user has permission
    const existingPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    // Students can update their own plans, advisors/admins can update any in their institution
    if (
      req.session.user!.role === 'student' &&
      existingPlan.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existingPlan.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updateData: any = {};
    if (completedHours !== undefined) updateData.completedHours = parseFloat(completedHours);
    if (completedQuestions !== undefined) updateData.completedQuestions = parseInt(completedQuestions);
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted === true || isCompleted === 'true';

    const updatedItem = await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        exam: {
          include: {
            examType: true,
          },
        },
      },
    });

    return res.json({ item: updatedItem });
  } catch (error) {
    console.error('Error updating study plan item:', error);
    return res.status(500).json({ error: 'Failed to update study plan item' });
  }
});

// Simulate "what-if" scenario
router.post('/:id/simulate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { examDateChange, hoursChange } = req.body;

    // Check plan exists and user has permission
    const existingPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    // Check authorization
    if (
      req.session.user!.role === 'student' &&
      existingPlan.student.userId !== req.session.user!.id
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (existingPlan.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Run simulation
    const simulation = await simulatePlanAdjustment({
      studentId: existingPlan.studentId,
      examDateChange: examDateChange
        ? {
            examId: examDateChange.examId,
            newDate: new Date(examDateChange.newDate),
          }
        : undefined,
      hoursChange: hoursChange ? parseFloat(hoursChange) : undefined,
    });

    return res.json({ simulation });
  } catch (error: any) {
    console.error('Error simulating plan adjustment:', error);
    return res.status(500).json({ error: error.message || 'Failed to simulate plan adjustment' });
  }
});

// Delete a study plan
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check plan exists and user has permission
    const existingPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: 'Study plan not found' });
    }

    // Only advisors/admins can delete plans
    if (req.session.user!.role === 'student') {
      return res.status(403).json({ error: 'Students cannot delete study plans' });
    }

    if (existingPlan.student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete plan (cascade will delete items)
    await prisma.studyPlan.delete({
      where: { id },
    });

    return res.json({ message: 'Study plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting study plan:', error);
    return res.status(500).json({ error: 'Failed to delete study plan' });
  }
});

export default router;
