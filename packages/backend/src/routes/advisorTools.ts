import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as advisorService from '../services/advisorTools.js';
import * as reflectionsService from '../services/studentReflections.js';
import { getRiskTimeline } from '../services/riskAssessment.js';

const router = Router();

// ============================================================================
// ADVISOR NOTES
// ============================================================================

// Get advisor notes for a student
router.get('/students/:studentId/notes', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, isPinned, limit } = req.query;

    const notes = await advisorService.getAdvisorNotes(studentId, {
      type: type as any,
      isPinned: isPinned === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return res.json({ notes });
  } catch (error: any) {
    console.error('Failed to fetch advisor notes:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create advisor note
router.post('/students/:studentId/notes', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, title, content, assessmentId, studyPlanId, alertId, isPinned, tags } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const note = await advisorService.createAdvisorNote({
      studentId,
      authorId: req.session.userId!,
      type,
      title,
      content,
      assessmentId,
      studyPlanId,
      alertId,
      isPinned,
      tags,
    });

    return res.status(201).json({ note });
  } catch (error: any) {
    console.error('Failed to create advisor note:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update advisor note
router.patch('/notes/:noteId', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { title, content, isPinned, tags } = req.body;

    const note = await advisorService.updateAdvisorNote(noteId, {
      title,
      content,
      isPinned,
      tags,
    });

    return res.json({ note });
  } catch (error: any) {
    console.error('Failed to update advisor note:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete advisor note
router.delete('/notes/:noteId', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.params;
    await advisorService.deleteAdvisorNote(noteId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete advisor note:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STUDENT FLAGS
// ============================================================================

// Get flags for a student
router.get('/students/:studentId/flags', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, priority } = req.query;

    const flags = await advisorService.getStudentFlags(studentId, {
      status: status as any,
      priority: priority as any,
    });

    return res.json({ flags });
  } catch (error: any) {
    console.error('Failed to fetch student flags:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all active flags for institution
router.get('/flags/active', requireAuth, async (req, res) => {
  try {
    const flags = await advisorService.getAllActiveFlags(req.session.institutionId!);
    return res.json({ flags });
  } catch (error: any) {
    console.error('Failed to fetch active flags:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create student flag
router.post('/students/:studentId/flags', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { priority, reason, notes, dueDate } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const flag = await advisorService.createStudentFlag({
      studentId,
      createdById: req.session.userId!,
      priority,
      reason,
      notes,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return res.status(201).json({ flag });
  } catch (error: any) {
    console.error('Failed to create student flag:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update student flag
router.patch('/flags/:flagId', requireAuth, async (req, res) => {
  try {
    const { flagId } = req.params;
    const { status, priority, reason, notes, dueDate } = req.body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (reason !== undefined) updates.reason = reason;
    if (notes !== undefined) updates.notes = notes;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    if (status === 'resolved') {
      updates.resolvedById = req.session.userId;
    }

    const flag = await advisorService.updateStudentFlag(flagId, updates);
    return res.json({ flag });
  } catch (error: any) {
    console.error('Failed to update student flag:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete student flag
router.delete('/flags/:flagId', requireAuth, async (req, res) => {
  try {
    const { flagId } = req.params;
    await advisorService.deleteStudentFlag(flagId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete student flag:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RISK OVERRIDES
// ============================================================================

// Get active risk override for a student
router.get('/students/:studentId/risk-override', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const override = await advisorService.getActiveRiskOverride(studentId);
    return res.json({ override });
  } catch (error: any) {
    console.error('Failed to fetch risk override:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create risk override
router.post('/students/:studentId/risk-override', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { originalRiskLevel, overrideRiskLevel, justification, expiresAt } = req.body;

    if (!originalRiskLevel || !overrideRiskLevel || !justification) {
      return res.status(400).json({
        error: 'originalRiskLevel, overrideRiskLevel, and justification are required',
      });
    }

    const override = await advisorService.createRiskOverride({
      studentId,
      overriddenById: req.session.userId!,
      originalRiskLevel,
      overrideRiskLevel,
      justification,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return res.status(201).json({ override });
  } catch (error: any) {
    console.error('Failed to create risk override:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Deactivate risk override
router.delete('/risk-overrides/:overrideId', requireAuth, async (req, res) => {
  try {
    const { overrideId } = req.params;
    await advisorService.deactivateRiskOverride(overrideId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to deactivate risk override:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TOP ACTIONS
// ============================================================================

// Get top actions for a student
router.get('/students/:studentId/top-actions', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const actions = await advisorService.generateTopActions(studentId);
    return res.json({ actions });
  } catch (error: any) {
    console.error('Failed to generate top actions:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RISK TIMELINE
// ============================================================================

// Get risk timeline for a student
router.get('/students/:studentId/risk-timeline', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const timeline = await getRiskTimeline(studentId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    return res.json({ timeline });
  } catch (error: any) {
    console.error('Failed to fetch risk timeline:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STUDENT REFLECTIONS
// ============================================================================

// Get reflections for a student
router.get('/students/:studentId/reflections', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { assessmentId, studyPlanId, limit, skip } = req.query;

    const reflections = await reflectionsService.getReflections(studentId, {
      assessmentId: assessmentId as string,
      studyPlanId: studyPlanId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      skip: skip ? parseInt(skip as string) : undefined,
    });

    return res.json({ reflections });
  } catch (error: any) {
    console.error('Failed to fetch reflections:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get reflection trends
router.get('/students/:studentId/reflections/trends', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const trends = await reflectionsService.getReflectionTrends(studentId);
    return res.json({ trends });
  } catch (error: any) {
    console.error('Failed to fetch reflection trends:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create reflection
router.post('/students/:studentId/reflections', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { content, assessmentId, studyPlanId, studyPlanItemId, voiceMemoPath, mood, tags } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const reflection = await reflectionsService.createReflection({
      studentId,
      content,
      assessmentId,
      studyPlanId,
      studyPlanItemId,
      voiceMemoPath,
      mood,
      tags,
    });

    return res.status(201).json({ reflection });
  } catch (error: any) {
    console.error('Failed to create reflection:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update reflection
router.patch('/reflections/:reflectionId', requireAuth, async (req, res) => {
  try {
    const { reflectionId } = req.params;
    const { content, voiceMemoPath, mood, tags } = req.body;

    const reflection = await reflectionsService.updateReflection(reflectionId, {
      content,
      voiceMemoPath,
      mood,
      tags,
    });

    return res.json({ reflection });
  } catch (error: any) {
    console.error('Failed to update reflection:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete reflection
router.delete('/reflections/:reflectionId', requireAuth, async (req, res) => {
  try {
    const { reflectionId } = req.params;
    await reflectionsService.deleteReflection(reflectionId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete reflection:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
