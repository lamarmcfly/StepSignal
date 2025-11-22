import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as analyticsService from '../services/cohortAnalytics.js';

const router = Router();

// ============================================================================
// COHORT RISK SUMMARY
// ============================================================================

router.get('/cohort/risk-summary', requireAuth, async (req, res) => {
  try {
    const { classYear, examTypeCode, weeksToExam } = req.query;

    const filters: any = {};

    if (classYear) {
      filters.classYear = parseInt(classYear as string);
    }

    if (examTypeCode) {
      filters.examTypeCode = examTypeCode as string;
    }

    if (weeksToExam !== undefined) {
      filters.weeksToExam = parseInt(weeksToExam as string);
    }

    const summary = await analyticsService.getCohortRiskSummary(
      req.session.institutionId!,
      filters
    );

    return res.json({ summary });
  } catch (error: any) {
    console.error('Failed to fetch cohort risk summary:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLERKSHIP COMPARISONS
// ============================================================================

router.get('/clerkships', requireAuth, async (req, res) => {
  try {
    const clerkships = await analyticsService.getClerkshipComparisons(
      req.session.institutionId!
    );

    return res.json({ clerkships });
  } catch (error: any) {
    console.error('Failed to fetch clerkship comparisons:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ADVISOR WORKLOAD
// ============================================================================

router.get('/advisor-workload', requireAuth, async (req, res) => {
  try {
    const workload = await analyticsService.getAdvisorWorkload(
      req.session.institutionId!
    );

    return res.json({ workload });
  } catch (error: any) {
    console.error('Failed to fetch advisor workload:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CSV EXPORT
// ============================================================================

router.get('/export/csv', requireAuth, async (req, res) => {
  try {
    const csv = await analyticsService.generateDeidentifiedStatsCSV(
      req.session.institutionId!
    );

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cohort-analytics-${new Date().toISOString().split('T')[0]}.csv"`
    );

    return res.send(csv);
  } catch (error: any) {
    console.error('Failed to generate CSV export:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AVAILABLE EXAM TYPES (for filters)
// ============================================================================

router.get('/exam-types', requireAuth, async (req, res) => {
  try {
    const { prisma } = await import('@stepsignal/database');

    const examTypes = await prisma.examType.findMany({
      select: {
        code: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json({ examTypes });
  } catch (error: any) {
    console.error('Failed to fetch exam types:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AVAILABLE CLASS YEARS (for filters)
// ============================================================================

router.get('/class-years', requireAuth, async (req, res) => {
  try {
    const { prisma } = await import('@stepsignal/database');

    const classYears = await prisma.student.findMany({
      where: {
        institutionId: req.session.institutionId!,
      },
      select: {
        classYear: true,
      },
      distinct: ['classYear'],
      orderBy: {
        classYear: 'asc',
      },
    });

    return res.json({
      classYears: classYears.map((s) => s.classYear),
    });
  } catch (error: any) {
    console.error('Failed to fetch class years:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
