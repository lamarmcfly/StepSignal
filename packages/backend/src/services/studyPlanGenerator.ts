import { prisma } from '@stepsignal/database';
import type { MedicalSystem, ErrorType } from '@stepsignal/database';

interface ExamAllocation {
  examId: string;
  examName: string;
  scheduledDate: Date;
  weeksUntilExam: number;
  importanceWeight: number;
  allocatedWeeklyHours: number;
}

interface WeeklyPlanData {
  weekNumber: number;
  examId: string | null;
  allocatedHours: number;
  targetQuestions: number;
  focusSystems: string[];
  focusErrorTypes: string[];
  focusTopics: string[];
  recommendations: string;
  resourceLinks: string[];
}

interface StudyPlanGenerationParams {
  studentId: string;
  weeklyHoursAvailable: number;
  dailyHoursCap?: number;
  startDate: Date;
  title?: string;
}

const QUESTIONS_PER_HOUR = 10; // Average questions that can be completed per hour

/**
 * Main function to generate a personalized study plan for a student
 * This implements the rules-based allocation engine
 */
export async function generateStudyPlan(params: StudyPlanGenerationParams) {
  const {
    studentId,
    weeklyHoursAvailable,
    dailyHoursCap = 4.0,
    startDate,
    title,
  } = params;

  // 1. Fetch student data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      exams: {
        where: {
          scheduledDate: {
            gte: startDate,
          },
          outcome: null, // Only upcoming exams (not yet completed)
        },
        include: {
          examType: true,
        },
        orderBy: {
          scheduledDate: 'asc',
        },
      },
      riskProfile: true,
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  if (!student.riskProfile) {
    throw new Error('Student has no risk profile. Please calculate risk profile first.');
  }

  if (student.exams.length === 0) {
    throw new Error('No upcoming exams scheduled for this student');
  }

  // 2. Calculate plan end date (until the last exam)
  const lastExam = student.exams[student.exams.length - 1];
  const endDate = new Date(lastExam.scheduledDate);

  // 3. Calculate total weeks in the plan
  const totalWeeks = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  if (totalWeeks <= 0) {
    throw new Error('Invalid date range: end date must be after start date');
  }

  // 4. Allocate time across exams based on proximity, risk, and importance
  const examAllocations = allocateTimeAcrossExams(
    student.exams,
    student.riskProfile.overallRiskScore,
    startDate,
    weeklyHoursAvailable
  );

  // 5. Generate weekly breakdowns
  const weeklyPlans = generateWeeklyBreakdowns(
    examAllocations,
    student.riskProfile,
    totalWeeks,
    weeklyHoursAvailable
  );

  // 6. Create the study plan in database
  const studyPlan = await prisma.studyPlan.create({
    data: {
      studentId,
      status: 'draft',
      title: title || `Study Plan - ${new Date().toLocaleDateString()}`,
      weeklyHoursAvailable,
      dailyHoursCap,
      startDate,
      endDate,
      settings: {
        examAllocations: examAllocations.map((ea) => ({
          examId: ea.examId,
          weeksUntilExam: ea.weeksUntilExam,
          allocatedWeeklyHours: ea.allocatedWeeklyHours,
        })),
      },
      items: {
        create: weeklyPlans.map((week) => ({
          weekNumber: week.weekNumber,
          examId: week.examId,
          allocatedHours: week.allocatedHours,
          targetQuestions: week.targetQuestions,
          focusSystems: week.focusSystems,
          focusErrorTypes: week.focusErrorTypes,
          focusTopics: week.focusTopics,
          recommendations: week.recommendations,
          resourceLinks: week.resourceLinks,
        })),
      },
    },
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

  return studyPlan;
}

/**
 * Allocate study time across multiple exams based on:
 * - Proximity (sooner exams get more priority)
 * - Risk level (higher risk means more study needed)
 * - Exam importance/weight
 */
function allocateTimeAcrossExams(
  exams: any[],
  riskScore: number,
  startDate: Date,
  weeklyHoursAvailable: number
): ExamAllocation[] {
  const allocations: ExamAllocation[] = [];

  // Calculate weeks until each exam
  const examData = exams.map((exam) => {
    const weeksUntilExam = Math.max(
      1,
      Math.ceil(
        (new Date(exam.scheduledDate).getTime() - startDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    );

    return {
      examId: exam.id,
      examName: exam.examType.name,
      scheduledDate: new Date(exam.scheduledDate),
      weeksUntilExam,
      importanceWeight: exam.examType.defaultWeight,
    };
  });

  // Calculate priority scores for each exam
  // Priority = (importanceWeight * 2) / weeksUntilExam + (riskScore / 100)
  const examPriorities = examData.map((exam) => ({
    ...exam,
    priorityScore:
      (exam.importanceWeight * 2) / exam.weeksUntilExam + riskScore / 100,
  }));

  // Normalize priority scores to allocate weekly hours
  const totalPriority = examPriorities.reduce(
    (sum, e) => sum + e.priorityScore,
    0
  );

  examPriorities.forEach((exam) => {
    const proportion = exam.priorityScore / totalPriority;
    const allocatedWeeklyHours = proportion * weeklyHoursAvailable;

    allocations.push({
      examId: exam.examId,
      examName: exam.examName,
      scheduledDate: exam.scheduledDate,
      weeksUntilExam: exam.weeksUntilExam,
      importanceWeight: exam.importanceWeight,
      allocatedWeeklyHours,
    });
  });

  return allocations;
}

/**
 * Generate weekly plan items with specific focus areas and recommendations
 */
function generateWeeklyBreakdowns(
  examAllocations: ExamAllocation[],
  riskProfile: any,
  totalWeeks: number,
  weeklyHoursAvailable: number
): WeeklyPlanData[] {
  const weeklyPlans: WeeklyPlanData[] = [];

  // Identify top 3 weak systems
  const systemWeaknesses = riskProfile.systemWeaknesses as Record<string, number>;
  const topWeakSystems = Object.entries(systemWeaknesses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([system]) => system);

  // Identify dominant error types (top 2)
  const errorCounts = [
    { type: 'knowledge_deficit', count: riskProfile.knowledgeDeficitCount },
    { type: 'misread', count: riskProfile.misreadCount },
    { type: 'premature_closure', count: riskProfile.prematureClosureCount },
    { type: 'time_management', count: riskProfile.timeManagementCount },
    { type: 'strategy_error', count: riskProfile.strategyErrorCount },
  ];

  const topErrorTypes = errorCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((e) => e.type);

  // Generate plans for each week
  for (let week = 1; week <= totalWeeks; week++) {
    // Find the most relevant exam for this week (closest upcoming exam)
    const relevantExam = findRelevantExamForWeek(examAllocations, week);

    // Calculate hours for this week
    const allocatedHours = relevantExam?.allocatedWeeklyHours || weeklyHoursAvailable;

    // Calculate target questions
    const targetQuestions = Math.round(allocatedHours * QUESTIONS_PER_HOUR);

    // Rotate focus systems to ensure comprehensive coverage
    const weekFocusSystems = rotateWeeklyFocus(topWeakSystems, week, 2);

    // Generate recommendations
    const recommendations = generateWeeklyRecommendations(
      week,
      relevantExam,
      weekFocusSystems,
      topErrorTypes,
      riskProfile
    );

    weeklyPlans.push({
      weekNumber: week,
      examId: relevantExam?.examId || null,
      allocatedHours,
      targetQuestions,
      focusSystems: weekFocusSystems,
      focusErrorTypes: topErrorTypes,
      focusTopics: [], // Can be customized based on specific needs
      recommendations,
      resourceLinks: [], // Can be populated with actual resources
    });
  }

  return weeklyPlans;
}

/**
 * Find the most relevant exam for a given week
 */
function findRelevantExamForWeek(
  examAllocations: ExamAllocation[],
  weekNumber: number
): ExamAllocation | null {
  // Find the exam that is closest but still in the future relative to this week
  const relevantExams = examAllocations.filter(
    (exam) => exam.weeksUntilExam >= weekNumber
  );

  if (relevantExams.length === 0) {
    return null;
  }

  // Return the closest upcoming exam
  return relevantExams.reduce((closest, exam) =>
    exam.weeksUntilExam < closest.weeksUntilExam ? exam : closest
  );
}

/**
 * Rotate focus areas week by week to ensure comprehensive coverage
 */
function rotateWeeklyFocus(
  focusAreas: string[],
  weekNumber: number,
  count: number
): string[] {
  if (focusAreas.length === 0) return [];

  const startIndex = (weekNumber - 1) % focusAreas.length;
  const rotated: string[] = [];

  for (let i = 0; i < Math.min(count, focusAreas.length); i++) {
    rotated.push(focusAreas[(startIndex + i) % focusAreas.length]);
  }

  return rotated;
}

/**
 * Generate specific recommendations for the week
 */
function generateWeeklyRecommendations(
  weekNumber: number,
  exam: ExamAllocation | null,
  focusSystems: string[],
  errorTypes: string[],
  riskProfile: any
): string {
  const recommendations: string[] = [];

  // Exam-specific guidance
  if (exam) {
    if (exam.weeksUntilExam <= 2) {
      recommendations.push(
        `🎯 **Exam Approaching**: ${exam.examName} is in ${exam.weeksUntilExam} week(s). Focus on high-yield topics and practice full-length exams.`
      );
    } else {
      recommendations.push(
        `📚 **Preparing for**: ${exam.examName} (${exam.weeksUntilExam} weeks away). Build strong fundamentals in weak areas.`
      );
    }
  }

  // System-specific focus
  if (focusSystems.length > 0) {
    const systemNames = focusSystems
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(', ');
    recommendations.push(
      `🔬 **Focus Systems**: ${systemNames}. Complete targeted question sets and review key concepts.`
    );
  }

  // Error pattern guidance
  if (errorTypes.includes('knowledge_deficit')) {
    recommendations.push(
      `📖 **Knowledge Gaps**: Review foundational concepts and create summary sheets for weak topics.`
    );
  }

  if (errorTypes.includes('misread')) {
    recommendations.push(
      `👁️ **Reading Accuracy**: Practice highlighting key details in question stems. Slow down and identify critical information.`
    );
  }

  if (errorTypes.includes('premature_closure')) {
    recommendations.push(
      `🤔 **Critical Thinking**: Review all answer choices before selecting. Practice differential diagnosis reasoning.`
    );
  }

  if (errorTypes.includes('time_management')) {
    recommendations.push(
      `⏱️ **Time Management**: Practice timed blocks. Aim for ${Math.round(60 / QUESTIONS_PER_HOUR)} minutes per question on average.`
    );
  }

  if (errorTypes.includes('strategy_error')) {
    recommendations.push(
      `🎯 **Test Strategy**: Review question-solving frameworks. Practice eliminating obviously wrong answers first.`
    );
  }

  // Risk-based guidance
  if (riskProfile.riskLevel === 'critical' || riskProfile.riskLevel === 'high') {
    recommendations.push(
      `⚠️ **High Priority**: Consider scheduling office hours or tutoring sessions this week for additional support.`
    );
  }

  return recommendations.join('\n\n');
}

/**
 * Simulate "what-if" scenarios for plan adjustments
 */
export async function simulatePlanAdjustment(params: {
  studentId: string;
  examDateChange?: { examId: string; newDate: Date };
  hoursChange?: number;
}): Promise<{
  projectedRiskChange: number;
  weeklyHourImpact: number[];
  recommendations: string[];
}> {
  const { studentId, examDateChange, hoursChange } = params;

  // Fetch current student data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      riskProfile: true,
      exams: {
        where: {
          outcome: null,
        },
        include: {
          examType: true,
        },
      },
    },
  });

  if (!student || !student.riskProfile) {
    throw new Error('Student or risk profile not found');
  }

  // Calculate impact
  let projectedRiskChange = 0;
  const weeklyHourImpact: number[] = [];
  const recommendations: string[] = [];

  // Simulate exam date change impact
  if (examDateChange) {
    const exam = student.exams.find((e) => e.id === examDateChange.examId);
    if (exam) {
      const originalWeeks = Math.ceil(
        (new Date(exam.scheduledDate).getTime() - Date.now()) /
          (7 * 24 * 60 * 60 * 1000)
      );
      const newWeeks = Math.ceil(
        (examDateChange.newDate.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
      );

      if (newWeeks < originalWeeks) {
        // Less time = higher risk
        projectedRiskChange = 5;
        recommendations.push(
          `Moving the exam ${originalWeeks - newWeeks} week(s) earlier will increase pressure. Consider increasing weekly study hours.`
        );
      } else {
        // More time = lower risk
        projectedRiskChange = -3;
        recommendations.push(
          `Moving the exam ${newWeeks - originalWeeks} week(s) later provides more preparation time, potentially reducing risk.`
        );
      }
    }
  }

  // Simulate hours change impact
  if (hoursChange) {
    const percentChange = (hoursChange / 20) * 100; // Assuming baseline 20 hrs/week
    projectedRiskChange += -percentChange / 10; // More hours = less risk

    if (hoursChange > 0) {
      recommendations.push(
        `Increasing study time by ${hoursChange} hours/week could reduce overall risk score.`
      );
    } else {
      recommendations.push(
        `Decreasing study time by ${Math.abs(hoursChange)} hours/week may increase risk. Ensure efficient use of remaining time.`
      );
    }
  }

  return {
    projectedRiskChange,
    weeklyHourImpact,
    recommendations,
  };
}
