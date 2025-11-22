import { prisma } from '@stepsignal/database';
import type { ErrorType, MedicalSystem, RiskLevel } from '@stepsignal/database';
import * as settingsService from './institutionSettings.js';

interface RiskProfileData {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  knowledgeDeficitCount: number;
  misreadCount: number;
  prematureClosureCount: number;
  timeManagementCount: number;
  strategyErrorCount: number;
  systemWeaknesses: Record<string, number>;
  trendDirection: 'improving' | 'stable' | 'declining' | null;
  recentPerformance: number | null;
  totalErrorsAnalyzed: number;
}

/**
 * Calculate or update risk profile for a student
 * This should be called after new assessments are added
 */
export async function calculateRiskProfile(studentId: string): Promise<RiskProfileData> {
  // Fetch student to get institutionId
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { institutionId: true, hasAccommodations: true },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Fetch institution settings
  const settings = await settingsService.getInstitutionSettings(student.institutionId);

  // Fetch all assessments with error events for the student
  const assessments = await prisma.assessment.findMany({
    where: { studentId },
    include: {
      errorEvents: true,
    },
    orderBy: {
      dateTaken: 'desc',
    },
  });

  if (assessments.length === 0) {
    // No data yet, return zero-risk profile
    return {
      overallRiskScore: 0,
      riskLevel: 'low',
      knowledgeDeficitCount: 0,
      misreadCount: 0,
      prematureClosureCount: 0,
      timeManagementCount: 0,
      strategyErrorCount: 0,
      systemWeaknesses: {},
      trendDirection: null,
      recentPerformance: null,
      totalErrorsAnalyzed: 0,
    };
  }

  // Analyze cognitive error profile
  const cognitiveProfile = analyzeCognitiveProfile(assessments);

  // Analyze system weaknesses
  const systemWeaknesses = analyzeSystemWeaknesses(assessments);

  // Analyze performance trends
  const trendData = analyzeTrends(assessments);

  // Calculate overall risk score
  const overallRiskScore = calculateOverallRiskScore(
    assessments,
    cognitiveProfile,
    systemWeaknesses,
    trendData
  );

  // Determine risk level using institution-specific thresholds
  const riskLevel = determineRiskLevel(overallRiskScore, settings);

  // Count total errors
  const totalErrorsAnalyzed = assessments.reduce(
    (sum, assessment) => sum + assessment.errorEvents.length,
    0
  );

  return {
    overallRiskScore,
    riskLevel,
    knowledgeDeficitCount: cognitiveProfile.knowledge_deficit,
    misreadCount: cognitiveProfile.misread,
    prematureClosureCount: cognitiveProfile.premature_closure,
    timeManagementCount: cognitiveProfile.time_management,
    strategyErrorCount: cognitiveProfile.strategy_error,
    systemWeaknesses,
    trendDirection: trendData.direction,
    recentPerformance: trendData.recentPerformance,
    totalErrorsAnalyzed,
  };
}

/**
 * Analyze distribution of cognitive error types
 */
function analyzeCognitiveProfile(assessments: any[]): Record<ErrorType, number> {
  const profile: Record<ErrorType, number> = {
    knowledge_deficit: 0,
    misread: 0,
    premature_closure: 0,
    time_management: 0,
    strategy_error: 0,
  };

  for (const assessment of assessments) {
    for (const error of assessment.errorEvents) {
      profile[error.errorType as ErrorType]++;
    }
  }

  return profile;
}

/**
 * Analyze errors by medical system
 */
function analyzeSystemWeaknesses(assessments: any[]): Record<string, number> {
  const weaknesses: Record<string, number> = {};

  for (const assessment of assessments) {
    for (const error of assessment.errorEvents) {
      const system = error.system as MedicalSystem;
      weaknesses[system] = (weaknesses[system] || 0) + 1;
    }
  }

  return weaknesses;
}

/**
 * Analyze performance trends over time
 */
function analyzeTrends(assessments: any[]): {
  direction: 'improving' | 'stable' | 'declining' | null;
  recentPerformance: number | null;
} {
  if (assessments.length < 2) {
    return { direction: null, recentPerformance: null };
  }

  // Calculate average performance for recent assessments (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAssessments = assessments.filter(
    (a) => new Date(a.dateTaken) >= thirtyDaysAgo
  );

  if (recentAssessments.length === 0) {
    return { direction: null, recentPerformance: null };
  }

  // Calculate average percent correct for recent assessments
  const recentPerformance =
    recentAssessments.reduce((sum, a) => sum + (a.percentCorrect || 0), 0) /
    recentAssessments.length;

  // Compare recent performance to overall performance
  const overallPerformance =
    assessments.reduce((sum, a) => sum + (a.percentCorrect || 0), 0) / assessments.length;

  // Determine trend direction
  let direction: 'improving' | 'stable' | 'declining';
  const difference = recentPerformance - overallPerformance;

  if (difference > 0.05) {
    // More than 5% improvement
    direction = 'improving';
  } else if (difference < -0.05) {
    // More than 5% decline
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  return { direction, recentPerformance };
}

/**
 * Calculate overall risk score (0-100)
 * Higher score = higher risk
 */
function calculateOverallRiskScore(
  assessments: any[],
  cognitiveProfile: Record<ErrorType, number>,
  systemWeaknesses: Record<string, number>,
  trendData: { direction: string | null; recentPerformance: number | null }
): number {
  let score = 0;

  // Factor 1: Error frequency (40 points max)
  const totalErrors = Object.values(cognitiveProfile).reduce((sum, count) => sum + count, 0);
  const totalQuestions = assessments.reduce((sum, a) => sum + (a.totalQuestions || 0), 0);
  const errorRate = totalQuestions > 0 ? totalErrors / totalQuestions : 0;
  score += Math.min(errorRate * 100, 40);

  // Factor 2: Recent performance (30 points max)
  if (trendData.recentPerformance !== null) {
    const incorrectRate = 1 - trendData.recentPerformance;
    score += incorrectRate * 30;
  }

  // Factor 3: Error pattern diversity (15 points max)
  // More diverse error types = higher risk (indicates multiple problem areas)
  const errorTypes = Object.values(cognitiveProfile).filter((count) => count > 0).length;
  score += (errorTypes / 5) * 15;

  // Factor 4: System weakness concentration (15 points max)
  // High concentration in specific systems = higher risk
  const systemsWithErrors = Object.values(systemWeaknesses).filter((count) => count > 0).length;
  const maxSystemErrors = Math.max(...Object.values(systemWeaknesses), 0);
  const concentrationRatio = totalErrors > 0 ? maxSystemErrors / totalErrors : 0;
  score += concentrationRatio * 15;

  // Factor 5: Trend adjustment (±10 points)
  if (trendData.direction === 'improving') {
    score -= 10;
  } else if (trendData.direction === 'declining') {
    score += 10;
  }

  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine risk level based on overall score using institution-specific thresholds
 */
function determineRiskLevel(
  score: number,
  settings: { lowRiskThreshold: number; mediumRiskThreshold: number; highRiskThreshold: number }
): RiskLevel {
  if (score >= settings.highRiskThreshold) {
    return 'critical';
  } else if (score >= settings.mediumRiskThreshold) {
    return 'high';
  } else if (score >= settings.lowRiskThreshold) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Update or create risk profile in database
 */
export async function updateRiskProfileInDB(
  studentId: string,
  profileData: RiskProfileData
): Promise<void> {
  await prisma.riskProfile.upsert({
    where: { studentId },
    create: {
      studentId,
      ...profileData,
      lastCalculatedAt: new Date(),
    },
    update: {
      ...profileData,
      lastCalculatedAt: new Date(),
    },
  });
}

/**
 * Calculate risk profile and save to database
 * This is the main entry point that should be called after new assessments
 */
export async function recalculateAndSaveRiskProfile(studentId: string): Promise<void> {
  const profileData = await calculateRiskProfile(studentId);
  await updateRiskProfileInDB(studentId, profileData);

  // Record risk history snapshot
  await recordRiskHistory(studentId, profileData);

  // Process alert triggers after risk profile update
  // Import dynamically to avoid circular dependencies
  const { processAlertTriggers } = await import('./alertTriggers.js');
  await processAlertTriggers(studentId).catch((error) => {
    console.error('Failed to process alert triggers:', error);
    // Don't fail the risk calculation if alert processing fails
  });
}

/**
 * Record a snapshot of the current risk profile for historical tracking
 */
async function recordRiskHistory(
  studentId: string,
  profileData: RiskProfileData
): Promise<void> {
  await prisma.riskHistory.create({
    data: {
      studentId,
      overallRiskScore: profileData.overallRiskScore,
      riskLevel: profileData.riskLevel,
      knowledgeDeficitCount: profileData.knowledgeDeficitCount,
      misreadCount: profileData.misreadCount,
      prematureClosureCount: profileData.prematureClosureCount,
      timeManagementCount: profileData.timeManagementCount,
      strategyErrorCount: profileData.strategyErrorCount,
      totalErrorsAnalyzed: profileData.totalErrorsAnalyzed,
    },
  });
}

/**
 * Get risk history timeline for a student
 * Returns risk snapshots over time for visualization
 */
export async function getRiskTimeline(
  studentId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<any[]> {
  const where: any = { studentId };

  if (options?.startDate || options?.endDate) {
    where.recordedAt = {};
    if (options.startDate) {
      where.recordedAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.recordedAt.lte = options.endDate;
    }
  }

  return await prisma.riskHistory.findMany({
    where,
    orderBy: {
      recordedAt: 'asc',
    },
    take: options?.limit,
  });
}
