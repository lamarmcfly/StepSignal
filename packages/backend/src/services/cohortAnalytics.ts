import { prisma } from '@stepsignal/database';
import type { RiskLevel } from '@stepsignal/database';

// ============================================================================
// COHORT RISK SUMMARY
// ============================================================================

interface CohortRiskSummaryFilters {
  classYear?: number;
  examTypeCode?: string;
  weeksToExam?: number;
}

interface RiskDistribution {
  riskLevel: RiskLevel;
  count: number;
  percentage: number;
}

interface CohortRiskSummary {
  totalStudents: number;
  distribution: RiskDistribution[];
  averageRiskScore: number;
  filters: CohortRiskSummaryFilters;
}

export async function getCohortRiskSummary(
  institutionId: string,
  filters: CohortRiskSummaryFilters = {}
): Promise<CohortRiskSummary> {
  // Build where clause for students
  const studentWhere: any = {
    institutionId,
  };

  if (filters.classYear) {
    studentWhere.classYear = filters.classYear;
  }

  // If filtering by exam type or weeks to exam, we need to join with exams
  let studentIds: string[] | undefined;

  if (filters.examTypeCode || filters.weeksToExam !== undefined) {
    const examWhere: any = {
      outcome: null, // Only upcoming exams
    };

    if (filters.examTypeCode) {
      examWhere.examType = {
        code: filters.examTypeCode,
      };
    }

    if (filters.weeksToExam !== undefined) {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + filters.weeksToExam * 7);

      examWhere.scheduledDate = {
        gte: now,
        lte: futureDate,
      };
    }

    const exams = await prisma.exam.findMany({
      where: examWhere,
      select: { studentId: true },
      distinct: ['studentId'],
    });

    studentIds = exams.map((e) => e.studentId);

    if (studentIds.length > 0) {
      studentWhere.id = { in: studentIds };
    } else {
      // No students match the exam filters
      return {
        totalStudents: 0,
        distribution: [],
        averageRiskScore: 0,
        filters,
      };
    }
  }

  // Fetch students with risk profiles
  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      riskProfile: {
        select: {
          riskLevel: true,
          overallRiskScore: true,
        },
      },
    },
  });

  const studentsWithRisk = students.filter((s) => s.riskProfile !== null);
  const totalStudents = studentsWithRisk.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      distribution: [],
      averageRiskScore: 0,
      filters,
    };
  }

  // Calculate distribution
  const counts: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  let totalRiskScore = 0;

  studentsWithRisk.forEach((student) => {
    if (student.riskProfile) {
      counts[student.riskProfile.riskLevel]++;
      totalRiskScore += student.riskProfile.overallRiskScore;
    }
  });

  const distribution: RiskDistribution[] = (
    ['low', 'medium', 'high', 'critical'] as RiskLevel[]
  ).map((level) => ({
    riskLevel: level,
    count: counts[level],
    percentage: (counts[level] / totalStudents) * 100,
  }));

  return {
    totalStudents,
    distribution,
    averageRiskScore: totalRiskScore / totalStudents,
    filters,
  };
}

// ============================================================================
// CLERKSHIP COMPARISONS
// ============================================================================

interface ClerkshipStats {
  clerkshipName: string;
  studentCount: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topErrorType: string | null;
}

export async function getClerkshipComparisons(
  institutionId: string
): Promise<ClerkshipStats[]> {
  // Get all students with their clerkships and risk profiles
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      currentClerkship: { not: null },
    },
    include: {
      riskProfile: true,
    },
  });

  // Group by clerkship
  const clerkshipMap = new Map<string, any[]>();

  students.forEach((student) => {
    if (student.currentClerkship && student.riskProfile) {
      const clerkship = student.currentClerkship;
      if (!clerkshipMap.has(clerkship)) {
        clerkshipMap.set(clerkship, []);
      }
      clerkshipMap.get(clerkship)!.push(student);
    }
  });

  // Calculate stats for each clerkship
  const clerkshipStats: ClerkshipStats[] = [];

  clerkshipMap.forEach((studentsInClerkship, clerkshipName) => {
    const studentCount = studentsInClerkship.length;
    let totalRiskScore = 0;
    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    const errorCounts: Record<string, number> = {};

    studentsInClerkship.forEach((student) => {
      const profile = student.riskProfile;
      totalRiskScore += profile.overallRiskScore;
      riskCounts[profile.riskLevel as keyof typeof riskCounts]++;

      // Track error types
      if (profile.knowledgeDeficitCount > 0) {
        errorCounts.knowledge_deficit =
          (errorCounts.knowledge_deficit || 0) + profile.knowledgeDeficitCount;
      }
      if (profile.misreadCount > 0) {
        errorCounts.misread = (errorCounts.misread || 0) + profile.misreadCount;
      }
      if (profile.prematureClosureCount > 0) {
        errorCounts.premature_closure =
          (errorCounts.premature_closure || 0) + profile.prematureClosureCount;
      }
      if (profile.timeManagementCount > 0) {
        errorCounts.time_management =
          (errorCounts.time_management || 0) + profile.timeManagementCount;
      }
      if (profile.strategyErrorCount > 0) {
        errorCounts.strategy_error =
          (errorCounts.strategy_error || 0) + profile.strategyErrorCount;
      }
    });

    // Find top error type
    let topErrorType: string | null = null;
    let maxCount = 0;

    Object.entries(errorCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topErrorType = type;
      }
    });

    clerkshipStats.push({
      clerkshipName,
      studentCount,
      averageRiskScore: totalRiskScore / studentCount,
      riskDistribution: riskCounts,
      topErrorType,
    });
  });

  // Sort by average risk score descending
  return clerkshipStats.sort((a, b) => b.averageRiskScore - a.averageRiskScore);
}

// ============================================================================
// ADVISOR WORKLOAD
// ============================================================================

interface AdvisorWorkload {
  advisorId: string;
  advisorEmail: string;
  totalStudents: number;
  highRiskStudents: number;
  criticalRiskStudents: number;
  averageRiskScore: number;
  workloadPercentage: number;
}

export async function getAdvisorWorkload(
  institutionId: string
): Promise<AdvisorWorkload[]> {
  // Get all advisors in the institution
  const advisors = await prisma.user.findMany({
    where: {
      institutionId,
      role: 'advisor',
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (advisors.length === 0) {
    return [];
  }

  // Get all students with their assigned advisors and risk profiles
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      assignedAdvisorId: { not: null },
    },
    include: {
      riskProfile: {
        select: {
          riskLevel: true,
          overallRiskScore: true,
        },
      },
    },
  });

  // Calculate total students for workload percentage
  const totalStudents = students.length;

  // Group students by advisor
  const advisorMap = new Map<string, any[]>();

  students.forEach((student) => {
    if (student.assignedAdvisorId) {
      const advisorId = student.assignedAdvisorId;
      if (!advisorMap.has(advisorId)) {
        advisorMap.set(advisorId, []);
      }
      advisorMap.get(advisorId)!.push(student);
    }
  });

  // Calculate workload for each advisor
  const workloads: AdvisorWorkload[] = advisors.map((advisor) => {
    const advisorStudents = advisorMap.get(advisor.id) || [];
    const studentsWithRisk = advisorStudents.filter((s) => s.riskProfile !== null);

    let highRiskCount = 0;
    let criticalRiskCount = 0;
    let totalRiskScore = 0;

    studentsWithRisk.forEach((student) => {
      if (student.riskProfile) {
        totalRiskScore += student.riskProfile.overallRiskScore;

        if (student.riskProfile.riskLevel === 'high') {
          highRiskCount++;
        } else if (student.riskProfile.riskLevel === 'critical') {
          criticalRiskCount++;
          highRiskCount++; // Critical is also high risk
        }
      }
    });

    return {
      advisorId: advisor.id,
      advisorEmail: advisor.email,
      totalStudents: advisorStudents.length,
      highRiskStudents: highRiskCount,
      criticalRiskStudents: criticalRiskCount,
      averageRiskScore:
        studentsWithRisk.length > 0 ? totalRiskScore / studentsWithRisk.length : 0,
      workloadPercentage: totalStudents > 0 ? (advisorStudents.length / totalStudents) * 100 : 0,
    };
  });

  // Sort by total students descending
  return workloads.sort((a, b) => b.totalStudents - a.totalStudents);
}

// ============================================================================
// CSV EXPORT
// ============================================================================

export async function generateDeidentifiedStatsCSV(
  institutionId: string
): Promise<string> {
  const students = await prisma.student.findMany({
    where: { institutionId },
    include: {
      riskProfile: true,
      exams: {
        include: {
          examType: true,
        },
      },
      assessments: {
        select: {
          type: true,
          dateTaken: true,
          percentCorrect: true,
        },
      },
    },
  });

  // CSV Header
  const headers = [
    'Student_ID_Hash',
    'Class_Year',
    'Has_Accommodations',
    'Current_Clerkship',
    'Risk_Level',
    'Overall_Risk_Score',
    'Knowledge_Deficit_Count',
    'Misread_Count',
    'Premature_Closure_Count',
    'Time_Management_Count',
    'Strategy_Error_Count',
    'Total_Errors_Analyzed',
    'Trend_Direction',
    'Upcoming_Exam_Type',
    'Weeks_To_Exam',
    'Total_Assessments',
    'Avg_Assessment_Score',
  ];

  const rows: string[][] = [headers];

  students.forEach((student, index) => {
    const profile = student.riskProfile;

    // Find next upcoming exam
    const upcomingExam = student.exams
      .filter((e) => !e.outcome && new Date(e.scheduledDate) > new Date())
      .sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      )[0];

    const weeksToExam = upcomingExam
      ? Math.ceil(
          (new Date(upcomingExam.scheduledDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
        )
      : null;

    // Calculate average assessment score
    const assessmentsWithScores = student.assessments.filter((a) => a.percentCorrect !== null);
    const avgScore =
      assessmentsWithScores.length > 0
        ? assessmentsWithScores.reduce((sum, a) => sum + (a.percentCorrect || 0), 0) /
          assessmentsWithScores.length
        : null;

    const row = [
      `STUDENT_${index + 1}`, // De-identified hash
      student.classYear.toString(),
      student.hasAccommodations ? 'Yes' : 'No',
      student.currentClerkship || 'N/A',
      profile?.riskLevel || 'N/A',
      profile?.overallRiskScore?.toFixed(2) || 'N/A',
      profile?.knowledgeDeficitCount?.toString() || '0',
      profile?.misreadCount?.toString() || '0',
      profile?.prematureClosureCount?.toString() || '0',
      profile?.timeManagementCount?.toString() || '0',
      profile?.strategyErrorCount?.toString() || '0',
      profile?.totalErrorsAnalyzed?.toString() || '0',
      profile?.trendDirection || 'N/A',
      upcomingExam?.examType.code || 'N/A',
      weeksToExam?.toString() || 'N/A',
      student.assessments.length.toString(),
      avgScore !== null ? (avgScore * 100).toFixed(1) : 'N/A',
    ];

    rows.push(row);
  });

  // Convert to CSV string
  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}
