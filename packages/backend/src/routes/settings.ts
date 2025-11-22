import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import * as settingsService from '../services/institutionSettings.js';
import { prisma } from '@stepsignal/database';

const router = Router();

// ============================================================================
// GET INSTITUTION SETTINGS
// ============================================================================

router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await settingsService.getInstitutionSettings(
      req.session.institutionId!
    );

    return res.json({ settings });
  } catch (error: any) {
    console.error('Failed to fetch institution settings:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// UPDATE INSTITUTION SETTINGS (Admin only)
// ============================================================================

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      lowRiskThreshold,
      mediumRiskThreshold,
      highRiskThreshold,
      defaultWeeklyHours,
      defaultDailyHoursCap,
      accommodationsMultiplier,
      disclaimerText,
      enableAutoAlerts,
      enableStudyPlanEngine,
      customSettings,
    } = req.body;

    const updates: any = {};

    if (lowRiskThreshold !== undefined) updates.lowRiskThreshold = parseFloat(lowRiskThreshold);
    if (mediumRiskThreshold !== undefined) updates.mediumRiskThreshold = parseFloat(mediumRiskThreshold);
    if (highRiskThreshold !== undefined) updates.highRiskThreshold = parseFloat(highRiskThreshold);
    if (defaultWeeklyHours !== undefined) updates.defaultWeeklyHours = parseFloat(defaultWeeklyHours);
    if (defaultDailyHoursCap !== undefined) updates.defaultDailyHoursCap = parseFloat(defaultDailyHoursCap);
    if (accommodationsMultiplier !== undefined) updates.accommodationsMultiplier = parseFloat(accommodationsMultiplier);
    if (disclaimerText !== undefined) updates.disclaimerText = disclaimerText;
    if (enableAutoAlerts !== undefined) updates.enableAutoAlerts = Boolean(enableAutoAlerts);
    if (enableStudyPlanEngine !== undefined) updates.enableStudyPlanEngine = Boolean(enableStudyPlanEngine);
    if (customSettings !== undefined) updates.customSettings = customSettings;

    const settings = await settingsService.updateInstitutionSettings(
      req.session.institutionId!,
      updates
    );

    return res.json({
      settings,
      message: 'Settings updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update institution settings:', error);

    // Return appropriate status code for validation errors
    if (error.message.includes('must be') ||
        error.message.includes('thresholds') ||
        error.message.includes('multiplier')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RESET TO DEFAULTS (Admin only)
// ============================================================================

router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await settingsService.updateInstitutionSettings(
      req.session.institutionId!,
      {
        lowRiskThreshold: 25.0,
        mediumRiskThreshold: 50.0,
        highRiskThreshold: 75.0,
        defaultWeeklyHours: 20.0,
        defaultDailyHoursCap: 4.0,
        accommodationsMultiplier: 0.75,
        disclaimerText: null,
        enableAutoAlerts: true,
        enableStudyPlanEngine: true,
        customSettings: {},
      }
    );

    return res.json({
      settings,
      message: 'Settings reset to defaults',
    });
  } catch (error: any) {
    console.error('Failed to reset institution settings:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EXAM TYPE MANAGEMENT (Admin only)
// ============================================================================

// Get all exam types for institution
router.get('/exam-types', requireAuth, async (req, res) => {
  try {
    const examTypes = await prisma.examType.findMany({
      where: { institutionId: req.session.institutionId! },
      orderBy: { name: 'asc' },
    });

    return res.json({ examTypes });
  } catch (error: any) {
    console.error('Failed to fetch exam types:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create new exam type
router.post('/exam-types', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { code, name, defaultWeight } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const examType = await prisma.examType.create({
      data: {
        institutionId: req.session.institutionId!,
        code,
        name,
        defaultWeight: defaultWeight ? parseFloat(defaultWeight) : 1.0,
      },
    });

    return res.json({
      examType,
      message: 'Exam type created successfully',
    });
  } catch (error: any) {
    console.error('Failed to create exam type:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'An exam type with this code already exists' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// Update exam type
router.put('/exam-types/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, defaultWeight } = req.body;

    const updates: any = {};
    if (code) updates.code = code;
    if (name) updates.name = name;
    if (defaultWeight !== undefined) updates.defaultWeight = parseFloat(defaultWeight);

    const examType = await prisma.examType.update({
      where: {
        id,
        institutionId: req.session.institutionId!, // Ensure institution ownership
      },
      data: updates,
    });

    return res.json({
      examType,
      message: 'Exam type updated successfully',
    });
  } catch (error: any) {
    console.error('Failed to update exam type:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'An exam type with this code already exists' });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Exam type not found' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// Delete exam type
router.delete('/exam-types/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.examType.delete({
      where: {
        id,
        institutionId: req.session.institutionId!, // Ensure institution ownership
      },
    });

    return res.json({ message: 'Exam type deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete exam type:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Exam type not found' });
    }

    // Handle foreign key constraint (exam type in use)
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete exam type that is in use by existing exams',
      });
    }

    return res.status(500).json({ error: error.message });
  }
});

export default router;
