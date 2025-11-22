import { Router } from 'express';
import { prisma } from '@stepsignal/database';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  calculateRiskProfile,
  recalculateAndSaveRiskProfile,
} from '../services/riskAssessment.js';

const router = Router();

// Get risk profile for a student
router.get('/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists and belongs to same institution
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        riskProfile: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.institutionId !== req.session.user!.institutionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If no risk profile exists, calculate it
    if (!student.riskProfile) {
      await recalculateAndSaveRiskProfile(studentId);

      // Fetch the newly created profile
      const updatedStudent = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          riskProfile: true,
        },
      });

      return res.json({ riskProfile: updatedStudent!.riskProfile });
    }

    return res.json({ riskProfile: student.riskProfile });
  } catch (error) {
    console.error('Error fetching risk profile:', error);
    return res.status(500).json({ error: 'Failed to fetch risk profile' });
  }
});

// Manually trigger risk profile recalculation
router.post(
  '/:studentId/recalculate',
  requireAuth,
  requireRole('advisor', 'admin'),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      // Verify student exists and belongs to same institution
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.institutionId !== req.session.user!.institutionId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Recalculate and save risk profile
      await recalculateAndSaveRiskProfile(studentId);

      // Fetch updated profile
      const updatedStudent = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          riskProfile: true,
        },
      });

      return res.json({
        riskProfile: updatedStudent!.riskProfile,
        message: 'Risk profile recalculated successfully',
      });
    } catch (error) {
      console.error('Error recalculating risk profile:', error);
      return res.status(500).json({ error: 'Failed to recalculate risk profile' });
    }
  }
);

// Get high-risk students for an institution (for dashboard)
router.get(
  '/institution/high-risk',
  requireAuth,
  requireRole('advisor', 'admin'),
  async (req, res) => {
    try {
      const institutionId = req.session.user!.institutionId;

      // Find all students with high or critical risk levels
      const highRiskStudents = await prisma.student.findMany({
        where: {
          institutionId,
          riskProfile: {
            riskLevel: {
              in: ['high', 'critical'],
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          riskProfile: true,
        },
        orderBy: {
          riskProfile: {
            overallRiskScore: 'desc',
          },
        },
        take: 20, // Limit to top 20 highest risk students
      });

      return res.json({ students: highRiskStudents });
    } catch (error) {
      console.error('Error fetching high-risk students:', error);
      return res.status(500).json({ error: 'Failed to fetch high-risk students' });
    }
  }
);

export default router;
