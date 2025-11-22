import type express from 'express';
import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '@stepsignal/database';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recalculateAndSaveRiskProfile } from '../services/riskAssessment.js';

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Import QBank CSV (UWorld-style format)
router.post(
  '/qbank',
  requireAuth,
  requireRole('advisor', 'admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { studentId, blockName, dateTaken } = req.body;

      if (!studentId || !blockName || !dateTaken) {
        return res.status(400).json({
          error: 'Missing required fields: studentId, blockName, dateTaken',
        });
      }

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

      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      // Expected columns (flexible, will map common variations)
      // Question #, System, Topic, Correct (Y/N), Time, Notes
      const errorEvents = [];
      let correctCount = 0;
      let totalQuestions = records.length;

      for (const record of records) {
        const isCorrect =
          record.Correct?.toUpperCase() === 'Y' ||
          record.Correct?.toUpperCase() === 'YES' ||
          record.Correct === '1' ||
          record.Result?.toUpperCase() === 'CORRECT';

        if (isCorrect) {
          correctCount++;
          continue; // Skip correct answers
        }

        // Map error type from common column names
        let errorType = 'knowledge_deficit'; // default
        if (record['Error Type'] || record['ErrorType']) {
          const errorTypeValue = (record['Error Type'] || record['ErrorType']).toLowerCase();
          if (errorTypeValue.includes('misread')) errorType = 'misread';
          else if (errorTypeValue.includes('time')) errorType = 'time_management';
          else if (errorTypeValue.includes('closure')) errorType = 'premature_closure';
          else if (errorTypeValue.includes('strategy')) errorType = 'strategy_error';
        }

        // Map system from common column names
        let system = 'general'; // default
        const systemValue = (
          record.System ||
          record.Category ||
          record.Subject ||
          ''
        ).toLowerCase();

        if (systemValue.includes('cardio')) system = 'cardiovascular';
        else if (systemValue.includes('pulm') || systemValue.includes('respir')) system = 'pulmonary';
        else if (systemValue.includes('renal') || systemValue.includes('kidney')) system = 'renal';
        else if (systemValue.includes('gi') || systemValue.includes('gastro')) system = 'gastrointestinal';
        else if (systemValue.includes('endo')) system = 'endocrine';
        else if (systemValue.includes('neuro')) system = 'neurology';
        else if (systemValue.includes('psych')) system = 'psychiatry';
        else if (systemValue.includes('musculo') || systemValue.includes('ortho')) system = 'musculoskeletal';
        else if (systemValue.includes('derm') || systemValue.includes('skin')) system = 'dermatology';
        else if (systemValue.includes('repro') || systemValue.includes('ob')) system = 'reproductive';
        else if (systemValue.includes('heme') || systemValue.includes('blood')) system = 'hematology';
        else if (systemValue.includes('immun')) system = 'immunology';

        errorEvents.push({
          errorType,
          system,
          topic: record.Topic || record.Concept || null,
          questionRef: record['Question #'] || record['Question'] || record['Q#'] || null,
          reflection: record.Notes || record.Reflection || null,
        });
      }

      const percentCorrect = totalQuestions > 0 ? correctCount / totalQuestions : 0;

      // Create assessment with error events
      const assessment = await prisma.assessment.create({
        data: {
          studentId,
          type: 'qbank_block',
          name: blockName,
          dateTaken: new Date(dateTaken),
          percentCorrect,
          totalQuestions,
          metadata: {
            importedFrom: 'csv',
            importedAt: new Date().toISOString(),
          },
          errorEvents: {
            create: errorEvents,
          },
        },
        include: {
          errorEvents: true,
        },
      });

      // Recalculate risk profile after import
      await recalculateAndSaveRiskProfile(studentId).catch((error) => {
        console.error('Failed to recalculate risk profile:', error);
        // Don't fail the request if risk calculation fails
      });

      return res.status(201).json({
        assessment,
        summary: {
          totalQuestions,
          correctCount,
          incorrectCount: totalQuestions - correctCount,
          percentCorrect: Math.round(percentCorrect * 100),
          errorsLogged: errorEvents.length,
        },
      });
    } catch (error) {
      console.error('Error importing QBank CSV:', error);
      return res.status(500).json({ error: 'Failed to import QBank CSV' });
    }
  }
);

// Import NBME score report CSV
router.post(
  '/nbme',
  requireAuth,
  requireRole('advisor', 'admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: 'Missing required field: studentId' });
      }

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

      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      // Expected columns: Exam Name, Date, Score, Percent Correct, Total Questions
      const assessments = [];

      for (const record of records) {
        const examName = record['Exam Name'] || record['Exam'] || record['Assessment'];
        const dateTaken = record.Date || record['Date Taken'];
        const score = record.Score ? parseFloat(record.Score) : null;
        const percentCorrect = record['Percent Correct'] || record['% Correct']
          ? parseFloat(record['Percent Correct'] || record['% Correct']) / 100
          : null;
        const totalQuestions = record['Total Questions']
          ? parseInt(record['Total Questions'])
          : null;

        if (!examName || !dateTaken) {
          continue; // Skip invalid rows
        }

        // Determine assessment type
        let type = 'nbme_practice'; // default
        if (examName.toLowerCase().includes('shelf')) type = 'nbme_shelf';
        else if (examName.toLowerCase().includes('cbse')) type = 'cbse';

        const assessment = await prisma.assessment.create({
          data: {
            studentId,
            type,
            name: examName,
            dateTaken: new Date(dateTaken),
            score,
            percentCorrect,
            totalQuestions,
            metadata: {
              importedFrom: 'csv',
              importedAt: new Date().toISOString(),
            },
          },
        });

        assessments.push(assessment);
      }

      // Recalculate risk profile after import
      await recalculateAndSaveRiskProfile(studentId).catch((error) => {
        console.error('Failed to recalculate risk profile:', error);
        // Don't fail the request if risk calculation fails
      });

      return res.status(201).json({
        assessments,
        summary: {
          totalImported: assessments.length,
          skipped: records.length - assessments.length,
        },
      });
    } catch (error) {
      console.error('Error importing NBME CSV:', error);
      return res.status(500).json({ error: 'Failed to import NBME CSV' });
    }
  }
);

export default router;
