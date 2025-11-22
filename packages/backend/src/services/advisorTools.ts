import { prisma } from '@stepsignal/database';
import type { NoteType, FlagStatus, FlagPriority, RiskLevel } from '@stepsignal/database';

// ============================================================================
// ADVISOR NOTES
// ============================================================================

interface CreateAdvisorNoteParams {
  studentId: string;
  authorId: string;
  type?: NoteType;
  title?: string;
  content: string;
  assessmentId?: string;
  studyPlanId?: string;
  alertId?: string;
  isPinned?: boolean;
  tags?: string[];
}

export async function createAdvisorNote(params: CreateAdvisorNoteParams) {
  return await prisma.advisorNote.create({
    data: {
      studentId: params.studentId,
      authorId: params.authorId,
      type: params.type || 'general',
      title: params.title,
      content: params.content,
      assessmentId: params.assessmentId,
      studyPlanId: params.studyPlanId,
      alertId: params.alertId,
      isPinned: params.isPinned || false,
      tags: params.tags || [],
    },
  });
}

export async function getAdvisorNotes(studentId: string, options?: {
  type?: NoteType;
  isPinned?: boolean;
  limit?: number;
}) {
  const where: any = { studentId };

  if (options?.type) {
    where.type = options.type;
  }

  if (options?.isPinned !== undefined) {
    where.isPinned = options.isPinned;
  }

  return await prisma.advisorNote.findMany({
    where,
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
    take: options?.limit,
    include: {
      assessment: {
        select: {
          name: true,
          dateTaken: true,
        },
      },
      studyPlan: {
        select: {
          title: true,
        },
      },
      alert: {
        select: {
          title: true,
          severity: true,
        },
      },
    },
  });
}

export async function updateAdvisorNote(
  noteId: string,
  updates: {
    title?: string;
    content?: string;
    isPinned?: boolean;
    tags?: string[];
  }
) {
  return await prisma.advisorNote.update({
    where: { id: noteId },
    data: updates,
  });
}

export async function deleteAdvisorNote(noteId: string) {
  return await prisma.advisorNote.delete({
    where: { id: noteId },
  });
}

// ============================================================================
// STUDENT FLAGS
// ============================================================================

interface CreateStudentFlagParams {
  studentId: string;
  createdById: string;
  priority?: FlagPriority;
  reason: string;
  notes?: string;
  dueDate?: Date;
}

export async function createStudentFlag(params: CreateStudentFlagParams) {
  return await prisma.studentFlag.create({
    data: {
      studentId: params.studentId,
      createdById: params.createdById,
      priority: params.priority || 'medium',
      reason: params.reason,
      notes: params.notes,
      dueDate: params.dueDate,
    },
  });
}

export async function getStudentFlags(studentId: string, options?: {
  status?: FlagStatus;
  priority?: FlagPriority;
}) {
  const where: any = { studentId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.priority) {
    where.priority = options.priority;
  }

  return await prisma.studentFlag.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

export async function getAllActiveFlags(institutionId: string) {
  // Get all active flags for students in an institution
  return await prisma.studentFlag.findMany({
    where: {
      status: 'active',
      student: {
        institutionId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          classYear: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
    ],
  });
}

export async function updateStudentFlag(
  flagId: string,
  updates: {
    status?: FlagStatus;
    priority?: FlagPriority;
    reason?: string;
    notes?: string;
    dueDate?: Date | null;
    resolvedById?: string;
  }
) {
  const data: any = { ...updates };

  // Set resolvedAt timestamp if status is being changed to resolved
  if (updates.status === 'resolved' && updates.resolvedById) {
    data.resolvedAt = new Date();
  }

  return await prisma.studentFlag.update({
    where: { id: flagId },
    data,
  });
}

export async function deleteStudentFlag(flagId: string) {
  return await prisma.studentFlag.delete({
    where: { id: flagId },
  });
}

// ============================================================================
// RISK OVERRIDES
// ============================================================================

interface CreateRiskOverrideParams {
  studentId: string;
  overriddenById: string;
  originalRiskLevel: RiskLevel;
  overrideRiskLevel: RiskLevel;
  justification: string;
  expiresAt?: Date;
}

export async function createRiskOverride(params: CreateRiskOverrideParams) {
  // Deactivate any existing active overrides for this student
  await prisma.riskOverride.updateMany({
    where: {
      studentId: params.studentId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Create new override
  return await prisma.riskOverride.create({
    data: {
      studentId: params.studentId,
      overriddenById: params.overriddenById,
      originalRiskLevel: params.originalRiskLevel,
      overrideRiskLevel: params.overrideRiskLevel,
      justification: params.justification,
      expiresAt: params.expiresAt,
      isActive: true,
    },
  });
}

export async function getActiveRiskOverride(studentId: string) {
  const override = await prisma.riskOverride.findFirst({
    where: {
      studentId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Check if override has expired
  if (override && override.expiresAt && override.expiresAt < new Date()) {
    await prisma.riskOverride.update({
      where: { id: override.id },
      data: { isActive: false },
    });
    return null;
  }

  return override;
}

export async function deactivateRiskOverride(overrideId: string) {
  return await prisma.riskOverride.update({
    where: { id: overrideId },
    data: { isActive: false },
  });
}

/**
 * Get the effective risk level for a student (considering overrides)
 */
export async function getEffectiveRiskLevel(studentId: string): Promise<RiskLevel | null> {
  const override = await getActiveRiskOverride(studentId);

  if (override) {
    return override.overrideRiskLevel;
  }

  // Return the calculated risk level from risk profile
  const riskProfile = await prisma.riskProfile.findUnique({
    where: { studentId },
    select: { riskLevel: true },
  });

  return riskProfile?.riskLevel || null;
}

// ============================================================================
// TOP ACTIONS GENERATOR
// ============================================================================

/**
 * Generate top 3 recommended actions for a student based on their risk profile
 */
export async function generateTopActions(studentId: string): Promise<string[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      riskProfile: true,
      exams: {
        where: {
          outcome: null, // Upcoming exams only
          scheduledDate: {
            gte: new Date(),
          },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
        take: 1,
        include: {
          examType: true,
        },
      },
      studyPlans: {
        where: {
          status: 'active',
        },
        take: 1,
      },
    },
  });

  if (!student || !student.riskProfile) {
    return [];
  }

  const actions: string[] = [];
  const riskProfile = student.riskProfile;

  // Action 1: Address highest error type
  const errorTypes = [
    { type: 'knowledge_deficit', count: riskProfile.knowledgeDeficitCount },
    { type: 'misread', count: riskProfile.misreadCount },
    { type: 'premature_closure', count: riskProfile.prematureClosureCount },
    { type: 'time_management', count: riskProfile.timeManagementCount },
    { type: 'strategy_error', count: riskProfile.strategyErrorCount },
  ];

  const topError = errorTypes.sort((a, b) => b.count - a.count)[0];

  if (topError.count > 0) {
    const errorRecommendations: Record<string, string> = {
      knowledge_deficit: 'Schedule content review sessions for weak systems',
      misread: 'Practice question stem highlighting and key detail identification',
      premature_closure: 'Review all answer choices before selecting - practice differential reasoning',
      time_management: 'Complete timed practice blocks to build pacing skills',
      strategy_error: 'Review test-taking frameworks and elimination strategies',
    };
    actions.push(errorRecommendations[topError.type]);
  }

  // Action 2: Address upcoming exam if within 4 weeks
  if (student.exams.length > 0) {
    const nextExam = student.exams[0];
    const weeksUntilExam = Math.ceil(
      (new Date(nextExam.scheduledDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
    );

    if (weeksUntilExam <= 4) {
      if (riskProfile.riskLevel === 'critical' || riskProfile.riskLevel === 'high') {
        actions.push(
          `URGENT: ${nextExam.examType.name} in ${weeksUntilExam} week(s) - Consider intensive tutoring or exam delay`
        );
      } else {
        actions.push(
          `Begin full-length practice exams for ${nextExam.examType.name} (${weeksUntilExam} weeks away)`
        );
      }
    }
  }

  // Action 3: Study plan or system focus
  if (student.studyPlans.length === 0 && riskProfile.riskLevel !== 'low') {
    actions.push('Generate personalized study plan to address weaknesses systematically');
  } else {
    // Identify weakest system
    const systemWeaknesses = riskProfile.systemWeaknesses as Record<string, number>;
    const weakestSystem = Object.entries(systemWeaknesses)
      .sort(([, a], [, b]) => b - a)[0];

    if (weakestSystem && weakestSystem[1] > 0) {
      const systemName = weakestSystem[0].charAt(0).toUpperCase() + weakestSystem[0].slice(1);
      actions.push(`Focus this week on ${systemName} - complete targeted question sets and review key concepts`);
    }
  }

  return actions.slice(0, 3); // Return top 3
}
