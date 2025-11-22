import { prisma } from '@stepsignal/database';

interface CreateReflectionParams {
  studentId: string;
  content: string;
  assessmentId?: string;
  studyPlanId?: string;
  studyPlanItemId?: string;
  voiceMemoPath?: string;
  mood?: string;
  tags?: string[];
}

export async function createReflection(params: CreateReflectionParams) {
  return await prisma.studentReflection.create({
    data: {
      studentId: params.studentId,
      content: params.content,
      assessmentId: params.assessmentId,
      studyPlanId: params.studyPlanId,
      studyPlanItemId: params.studyPlanItemId,
      voiceMemoPath: params.voiceMemoPath,
      mood: params.mood,
      tags: params.tags || [],
    },
  });
}

export async function getReflections(studentId: string, options?: {
  assessmentId?: string;
  studyPlanId?: string;
  limit?: number;
  skip?: number;
}) {
  const where: any = { studentId };

  if (options?.assessmentId) {
    where.assessmentId = options.assessmentId;
  }

  if (options?.studyPlanId) {
    where.studyPlanId = options.studyPlanId;
  }

  return await prisma.studentReflection.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: options?.limit,
    skip: options?.skip,
    include: {
      assessment: {
        select: {
          name: true,
          type: true,
          dateTaken: true,
        },
      },
      studyPlan: {
        select: {
          title: true,
        },
      },
      studyPlanItem: {
        select: {
          weekNumber: true,
        },
      },
    },
  });
}

export async function getReflectionById(reflectionId: string) {
  return await prisma.studentReflection.findUnique({
    where: { id: reflectionId },
    include: {
      assessment: {
        select: {
          name: true,
          type: true,
          dateTaken: true,
        },
      },
      studyPlan: {
        select: {
          title: true,
        },
      },
      studyPlanItem: {
        select: {
          weekNumber: true,
        },
      },
    },
  });
}

export async function updateReflection(
  reflectionId: string,
  updates: {
    content?: string;
    voiceMemoPath?: string;
    mood?: string;
    tags?: string[];
  }
) {
  return await prisma.studentReflection.update({
    where: { id: reflectionId },
    data: updates,
  });
}

export async function deleteReflection(reflectionId: string) {
  return await prisma.studentReflection.delete({
    where: { id: reflectionId },
  });
}

/**
 * Get reflection trends for a student over time
 */
export async function getReflectionTrends(studentId: string) {
  const reflections = await prisma.studentReflection.findMany({
    where: { studentId },
    select: {
      createdAt: true,
      mood: true,
      tags: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Aggregate mood distribution
  const moodCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  reflections.forEach((reflection) => {
    if (reflection.mood) {
      moodCounts[reflection.mood] = (moodCounts[reflection.mood] || 0) + 1;
    }

    reflection.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return {
    totalReflections: reflections.length,
    moodDistribution: moodCounts,
    topTags: Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count })),
    recentMoods: reflections
      .slice(-10)
      .reverse()
      .map((r) => ({
        date: r.createdAt,
        mood: r.mood,
      })),
  };
}
