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
    const activeGoals = student.goalAssignments.filter((g: any) => g.status !== 'MASTERED');
    const masteredGoals = student.goalAssignments.filter((g: any) => g.status === 'MASTERED');
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
          STATION_1: student.goalAssignments.filter((g: any) => g.station === 'STATION_1'),
          STATION_2: student.goalAssignments.filter((g: any) => g.station === 'STATION_2'),
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

  static async getIncidentTrends(studentId?: string, start?: string, end?: string) {
    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (start && end) {
      where.timestamp = {
        gte: new Date(start),
        lte: new Date(end),
      };
    } else if (!start && !end) {
      // Default to last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      where.timestamp = { gte: sixMonthsAgo };
    }

    const incidents = await prisma.behaviorIncident.findMany({
      where,
      select: {
        timestamp: true,
        category: true,
        behaviorName: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by month and category
    const grouped: Record<string, Record<string, number>> = {};

    for (const incident of incidents) {
      const monthKey = `${incident.timestamp.getFullYear()}-${String(incident.timestamp.getMonth() + 1).padStart(2, '0')}`;
      const category = incident.category || 'OTHER';

      if (!grouped[monthKey]) {
        grouped[monthKey] = {};
      }
      grouped[monthKey][category] = (grouped[monthKey][category] || 0) + 1;
    }

    // Convert to sorted array format
    const trends = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, categories]) => ({
        month,
        categories: Object.entries(categories).map(([category, count]) => ({
          category,
          count,
        })),
        total: Object.values(categories).reduce((sum, c) => sum + c, 0),
      }));

    return { trends, totalIncidents: incidents.length };
  }

  static async getFilteredReports(filters: {
    studentId?: string;
    teacherId?: string;
    station?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { studentId, teacherId, station, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'SUBMITTED' as const,
    };
    if (studentId) where.studentId = studentId;
    if (teacherId) where.teacherId = teacherId;
    if (station) where.station = station;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [summaries, total] = await Promise.all([
      prisma.sessionSummary.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true },
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

  static async getTeacherPerformance(teacherId?: string) {
    const where = teacherId
      ? { teacherId }
      : {};

    // Sessions completed per teacher
    const sessions = await prisma.sessionSummary.groupBy({
      by: ['teacherId'],
      where: {
        ...where,
        status: { in: ['SUBMITTED', 'REVIEWED'] },
      },
      _count: { id: true },
      _avg: { totalTrials: true },
    });

    // Reviewed sessions per teacher
    const reviewedSessions = await prisma.sessionSummary.groupBy({
      by: ['teacherId'],
      where: {
        ...where,
        status: 'REVIEWED',
      },
      _count: { id: true },
    });

    const reviewedMap = new Map<string, number>(reviewedSessions.map((r: any) => [r.teacherId, r._count.id]));

    // Incidents per teacher
    const incidents = await prisma.behaviorIncident.groupBy({
      by: ['teacherId'],
      where,
      _count: { id: true },
    });

    const incidentMap = new Map<string, number>(incidents.map((i: any) => [i.teacherId, i._count.id]));

    // Independence outcomes from trials (SUCCESS = independent)
    const allTeacherIds = sessions.map((s: any) => s.teacherId);

    let independenceData: Array<{ teacherId: string; totalTrials: number; successRate: number }> = [];
    if (allTeacherIds.length > 0) {
      const trialResults = await prisma.trial.groupBy({
        by: ['teacherId'],
        where: {
          teacherId: { in: allTeacherIds },
        },
        _count: { id: true },
      });

      const successCounts = await prisma.trial.groupBy({
        by: ['teacherId'],
        where: {
          teacherId: { in: allTeacherIds },
          outcome: 'SUCCESS',
        },
        _count: { id: true },
      });

      const successMap = new Map<string, number>(successCounts.map((s: any) => [s.teacherId, s._count.id]));

      independenceData = trialResults.map((t: any) => ({
        teacherId: t.teacherId,
        totalTrials: t._count.id,
        successRate: t._count.id > 0 ? ((successMap.get(t.teacherId) || 0) / t._count.id) * 100 : 0,
      }));
    }

    const independenceMap = new Map(
      independenceData.map(d => [d.teacherId, d.totalTrials > 0 ? Math.round(d.successRate * 10) / 10 : 0])
    );

    // Fetch teacher names
    const teachers = await prisma.user.findMany({
      where: { id: { in: allTeacherIds.length > 0 ? allTeacherIds : ['__none__'] } },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    const teacherMap = new Map<string, any>(teachers.map((t: any) => [t.id, t]));

    return sessions.map((s: any) => {
      const totalSessions = s._count.id;
      const reviewedCount = reviewedMap.get(s.teacherId) || 0;
      const incidentCount = incidentMap.get(s.teacherId) || 0;
      const independence = independenceMap.get(s.teacherId) || 0;
      const teacher = teacherMap.get(s.teacherId);

      const metrics = {
        teacherId: s.teacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        avatar: teacher?.avatar || null,
        sessionsCompleted: totalSessions,
        avgTrialsPerSession: s._avg.totalTrials ? Math.round(s._avg.totalTrials * 10) / 10 : 0,
        avgIndependence: Math.round(independence * 10) / 10,
        incidentRate: totalSessions > 0 ? Math.round((incidentCount / totalSessions) * 100) / 100 : 0,
        reviewPercentage: totalSessions > 0 ? Math.round((reviewedCount / totalSessions) * 100) : 0,
      };

      // Determine performance tier
      const score =
        (metrics.avgIndependence > 80 ? 2 : metrics.avgIndependence > 60 ? 1 : 0) +
        (metrics.incidentRate < 0.5 ? 2 : metrics.incidentRate < 1 ? 1 : 0) +
        (metrics.reviewPercentage >= 80 ? 1 : 0);

      return {
        ...metrics,
        performanceTier: score >= 4 ? 'EXCELLENT' : score >= 2 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      };
    });
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
        goalsMastered: goals.filter((g: any) => g.status === 'MASTERED').length,
        behaviorIncidents: incidents,
      },
      goals,
    };
  }
}
