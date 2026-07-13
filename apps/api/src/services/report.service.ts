import prisma from '@melue/db';

export class ReportService {
  static async getSessionSummaries(filters: {
    studentId?: string;
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { studentId, teacherId, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      ...(studentId && { studentId }),
      ...(teacherId && { teacherId }),
      ...(startDate &&
        endDate && {
          startTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      status: 'SUBMITTED' as const,
    };

    const [summaries, total] = await Promise.all([
      prisma.sessionSummary.findMany({
        where,
        include: {
          student: {
            select: { firstName: true, lastName: true },
          },
          teacher: {
            select: { firstName: true, lastName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
      }),
      prisma.sessionSummary.count({ where }),
    ]);

    return {
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStudentProgress(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        goalAssignments: {
          where: { status: { in: ['ACTIVE', 'IN_PROGRESS', 'MASTERED'] } },
          include: {
            goal: {
              select: { name: true, type: true },
            },
          },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        behaviorIncidents: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Calculate overall progress
    const activeGoals = student.goalAssignments.filter((g) => g.status !== 'MASTERED');
    const masteredGoals = student.goalAssignments.filter((g) => g.status === 'MASTERED');
    const overallProgress =
      student.goalAssignments.length > 0
        ? masteredGoals.length / student.goalAssignments.length
        : 0;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
      },
      goals: {
        total: student.goalAssignments.length,
        active: activeGoals.length,
        mastered: masteredGoals.length,
        overallProgress: Math.round(overallProgress * 100),
        byStation: {
          STATION_1: student.goalAssignments.filter((g) => g.station === 'STATION_1'),
          STATION_2: student.goalAssignments.filter((g) => g.station === 'STATION_2'),
        },
      },
      recentAssessments: student.assessments,
      recentIncidents: student.behaviorIncidents,
    };
  }

  static async getFoundationOverview() {
    const [totalStudents, activeStudents, masteredThisMonth, recentIncidents, teachers] =
      await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { status: 'ACTIVE_THERAPY' } }),
        prisma.goalAssignment.count({
          where: {
            status: 'MASTERED',
            masteredAt: {
              gte: new Date(new Date().setDate(1)), // First of current month
            },
          },
        }),
        prisma.behaviorIncident.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        prisma.user.count({
          where: {
            isActive: true,
            roles: {
              some: {
                role: { name: 'Teacher' },
              },
            },
          },
        }),
      ]);

    // Program distribution
    const programDistribution = await prisma.student.groupBy({
      by: ['programType'],
      _count: true,
      where: { status: { not: 'INACTIVE' } },
    });

    // Therapy group distribution
    const therapyGroupDistribution = await prisma.student.groupBy({
      by: ['therapyGroup'],
      _count: true,
      where: { status: { not: 'INACTIVE' } },
    });

    return {
      totalStudents,
      activeStudents,
      masteredThisMonth,
      recentIncidents,
      activeTeachers: teachers,
      programDistribution,
      therapyGroupDistribution,
    };
  }

  static async generateBiAnnual(studentId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [student, sessions, goals, incidents] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.sessionSummary.count({
        where: {
          studentId,
      status: 'SUBMITTED' as const,
          startTime: { gte: sixMonthsAgo },
        },
      }),
      prisma.goalAssignment.findMany({
        where: {
          studentId,
          assignedAt: { gte: sixMonthsAgo },
        },
        include: {
          goal: { select: { name: true } },
        },
      }),
      prisma.behaviorIncident.count({
        where: {
          studentId,
          timestamp: { gte: sixMonthsAgo },
        },
      }),
    ]);

    if (!student) {
      throw new Error('Student not found');
    }

    return {
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
      },
      period: {
        start: sixMonthsAgo,
        end: new Date(),
      },
      summary: {
        sessionsCompleted: sessions,
        goalsAssigned: goals.length,
        goalsMastered: goals.filter((g) => g.status === 'MASTERED').length,
        behaviorIncidents: incidents,
      },
      goals,
    };
  }
}
