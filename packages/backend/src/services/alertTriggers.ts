import { prisma } from '@stepsignal/database';
import type { AlertType, AlertSeverity, RiskLevel } from '@stepsignal/database';

/**
 * Default alert threshold configuration
 * These can be customized per institution via settings
 */
interface AlertThresholds {
  criticalRiskScore: number;
  highRiskScore: number;
  mediumRiskScore: number;
  performanceDeclineThreshold: number; // Percentage points
  errorPatternThreshold: number; // Number of errors of same type
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  criticalRiskScore: 75,
  highRiskScore: 50,
  mediumRiskScore: 25,
  performanceDeclineThreshold: 10, // 10% decline triggers alert
  errorPatternThreshold: 5, // 5+ errors of same type triggers alert
};

/**
 * Check for risk level changes and generate alerts
 */
export async function checkRiskLevelChange(
  studentId: string,
  currentRiskLevel: RiskLevel,
  currentRiskScore: number
): Promise<void> {
  // Get the previous risk profile to detect changes
  const previousAlerts = await prisma.alert.findMany({
    where: {
      studentId,
      type: 'risk_level_change',
    },
    orderBy: {
      triggeredAt: 'desc',
    },
    take: 1,
  });

  // Get the previous risk level from metadata if it exists
  const previousRiskLevel = previousAlerts[0]?.metadata as any;
  const oldLevel = previousRiskLevel?.from as RiskLevel | undefined;

  // Only create alert if risk level increased
  if (oldLevel && shouldAlertOnRiskChange(oldLevel, currentRiskLevel)) {
    await createAlert(
      studentId,
      'risk_level_change',
      determineSeverityFromRiskLevel(currentRiskLevel),
      `Risk Level Elevated: ${oldLevel.toUpperCase()} → ${currentRiskLevel.toUpperCase()}`,
      `This student's risk level has increased from ${oldLevel} to ${currentRiskLevel}. ` +
        `Current risk score: ${Math.round(currentRiskScore)}. Review their recent assessments and consider scheduling an intervention.`,
      {
        from: oldLevel,
        to: currentRiskLevel,
        score: currentRiskScore,
      }
    );
  }
}

/**
 * Check if risk score crosses critical thresholds
 */
export async function checkRiskThresholds(
  studentId: string,
  riskScore: number,
  riskLevel: RiskLevel,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  // Check for critical risk (score >= 75)
  if (riskScore >= thresholds.criticalRiskScore && riskLevel === 'critical') {
    // Check if we already have an unresolved critical alert
    const existingCriticalAlert = await prisma.alert.findFirst({
      where: {
        studentId,
        type: 'risk_threshold_exceeded',
        severity: 'critical',
        status: { in: ['unread', 'read', 'acknowledged'] },
      },
    });

    if (!existingCriticalAlert) {
      await createAlert(
        studentId,
        'risk_threshold_exceeded',
        'critical',
        '🚨 Critical Risk Alert',
        `This student has reached a CRITICAL risk level with a score of ${Math.round(riskScore)}/100. ` +
          `Immediate intervention is strongly recommended. Please schedule a meeting and create an action plan as soon as possible.`,
        {
          score: riskScore,
          threshold: thresholds.criticalRiskScore,
          level: riskLevel,
        }
      );
    }
  }

  // Check for high risk (score >= 50)
  if (riskScore >= thresholds.highRiskScore && riskLevel === 'high') {
    const existingHighAlert = await prisma.alert.findFirst({
      where: {
        studentId,
        type: 'risk_threshold_exceeded',
        severity: 'warning',
        status: { in: ['unread', 'read', 'acknowledged'] },
      },
    });

    if (!existingHighAlert) {
      await createAlert(
        studentId,
        'risk_threshold_exceeded',
        'warning',
        '⚠️ High Risk Alert',
        `This student has reached a HIGH risk level with a score of ${Math.round(riskScore)}/100. ` +
          `Consider scheduling an intervention to address their performance patterns and provide additional support.`,
        {
          score: riskScore,
          threshold: thresholds.highRiskScore,
          level: riskLevel,
        }
      );
    }
  }
}

/**
 * Check for concerning performance decline trends
 */
export async function checkPerformanceDecline(
  studentId: string,
  trendDirection: string | null,
  recentPerformance: number | null,
  totalErrorsAnalyzed: number
): Promise<void> {
  if (trendDirection === 'declining' && recentPerformance !== null) {
    // Check if there's already an active performance decline alert
    const existingAlert = await prisma.alert.findFirst({
      where: {
        studentId,
        type: 'performance_decline',
        status: { in: ['unread', 'read', 'acknowledged'] },
      },
    });

    if (!existingAlert) {
      const performancePercent = Math.round(recentPerformance * 100);
      await createAlert(
        studentId,
        'performance_decline',
        'warning',
        '📉 Performance Decline Detected',
        `This student's recent performance shows a declining trend (${performancePercent}% correct). ` +
          `Based on ${totalErrorsAnalyzed} analyzed errors, their performance has decreased compared to their historical average. ` +
          `Early intervention could help reverse this trend.`,
        {
          recentPerformance: performancePercent,
          totalErrors: totalErrorsAnalyzed,
        }
      );
    }
  }
}

/**
 * Check for concerning error patterns (high concentration in one error type)
 */
export async function checkErrorPatterns(
  studentId: string,
  cognitiveProfile: {
    knowledgeDeficitCount: number;
    misreadCount: number;
    prematureClosureCount: number;
    timeManagementCount: number;
    strategyErrorCount: number;
  },
  totalErrors: number,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<void> {
  const errorTypes = [
    { type: 'knowledge_deficit', count: cognitiveProfile.knowledgeDeficitCount, label: 'Knowledge Deficits' },
    { type: 'misread', count: cognitiveProfile.misreadCount, label: 'Misreading/Misinterpretation' },
    { type: 'premature_closure', count: cognitiveProfile.prematureClosureCount, label: 'Premature Closure' },
    { type: 'time_management', count: cognitiveProfile.timeManagementCount, label: 'Time Management' },
    { type: 'strategy_error', count: cognitiveProfile.strategyErrorCount, label: 'Strategy Errors' },
  ];

  // Check each error type
  for (const errorType of errorTypes) {
    if (errorType.count >= thresholds.errorPatternThreshold) {
      const percentage = totalErrors > 0 ? Math.round((errorType.count / totalErrors) * 100) : 0;

      // Check if we already have an active alert for this pattern
      const existingAlert = await prisma.alert.findFirst({
        where: {
          studentId,
          type: 'error_pattern_detected',
          status: { in: ['unread', 'read', 'acknowledged'] },
          metadata: {
            path: ['errorType'],
            equals: errorType.type,
          },
        },
      });

      if (!existingAlert && percentage >= 30) { // At least 30% of errors are this type
        await createAlert(
          studentId,
          'error_pattern_detected',
          'info',
          `🔍 Error Pattern Detected: ${errorType.label}`,
          `This student has a high concentration of ${errorType.label.toLowerCase()} errors (${errorType.count} errors, ${percentage}% of total). ` +
            `This pattern suggests a specific area that could benefit from targeted intervention and skill development.`,
          {
            errorType: errorType.type,
            count: errorType.count,
            percentage,
            totalErrors,
          }
        );
      }
    }
  }
}

/**
 * Main function to process all alert triggers for a student
 * Should be called after risk profile recalculation
 */
export async function processAlertTriggers(studentId: string): Promise<void> {
  // Fetch the current risk profile
  const riskProfile = await prisma.riskProfile.findUnique({
    where: { studentId },
  });

  if (!riskProfile) {
    return; // No risk profile yet, nothing to check
  }

  // Check all alert conditions
  await Promise.all([
    checkRiskThresholds(studentId, riskProfile.overallRiskScore, riskProfile.riskLevel),
    checkRiskLevelChange(studentId, riskProfile.riskLevel, riskProfile.overallRiskScore),
    checkPerformanceDecline(
      studentId,
      riskProfile.trendDirection,
      riskProfile.recentPerformance,
      riskProfile.totalErrorsAnalyzed
    ),
    checkErrorPatterns(
      studentId,
      {
        knowledgeDeficitCount: riskProfile.knowledgeDeficitCount,
        misreadCount: riskProfile.misreadCount,
        prematureClosureCount: riskProfile.prematureClosureCount,
        timeManagementCount: riskProfile.timeManagementCount,
        strategyErrorCount: riskProfile.strategyErrorCount,
      },
      riskProfile.totalErrorsAnalyzed
    ),
  ]);
}

/**
 * Helper: Create an alert in the database
 */
async function createAlert(
  studentId: string,
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await prisma.alert.create({
    data: {
      studentId,
      type,
      severity,
      title,
      message,
      metadata,
    },
  });
}

/**
 * Helper: Determine if we should alert on a risk level change
 */
function shouldAlertOnRiskChange(oldLevel: RiskLevel, newLevel: RiskLevel): boolean {
  const riskHierarchy: Record<RiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return riskHierarchy[newLevel] > riskHierarchy[oldLevel];
}

/**
 * Helper: Determine alert severity from risk level
 */
function determineSeverityFromRiskLevel(riskLevel: RiskLevel): AlertSeverity {
  switch (riskLevel) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'warning';
    default:
      return 'info';
  }
}
