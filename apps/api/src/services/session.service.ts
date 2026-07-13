import prisma from '@melue/db';

export class SessionService {
  static async getActiveBlock() {
    const now = new Date();
    const block = await prisma.sessionBlock.findFirst({
      where: {
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        assignments: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
            student: {
              select: { id: true, firstName: true, lastName: true, headshotUrl: true },
            },
          },
        },
      },
    });

    return block;
  }

  static async getTeacherAssignments(teacherId: string, blockId?: string) {
    const now = new Date();

    const where = {
      teacherId,
      ...(blockId
        ? { sessionId: blockId }
        : {
            session: {
              startTime: { lte: now },
              endTime: { gte: now },
            },
          }),
    };

    const assignments = await prisma.sessionAssignment.findMany({
      where,
      include: {
        session: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            headshotUrl: true,
          },
        },
      },
    });

    return assignments;
  }

  static async submitSummary(sessionId: string, studentId: string, teacherId: string, notes?: string) {
    const assignment = await prisma.sessionAssignment.findFirst({
      where: {
        sessionId,
        studentId,
        teacherId,
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Get trial data for this student in this session
    const trials = await prisma.trial.findMany({
      where: {
        studentId,
        teacherId,
        timestamp: {
          gte: new Date(), // TODO: Filter by session time range
        },
      },
      include: {
        goal: {
          include: {
            goal: { select: { name: true } },
          },
        },
      },
    });

    // Calculate per-goal breakdown
    const goalData: Record<string, { total: number; successes: number; failures: number; prompts: Record<string, number> }> = {};

    for (const trial of trials) {
      const goalId = trial.goalId;
      if (!goalData[goalId]) {
        goalData[goalId] = { total: 0, successes: 0, failures: 0, prompts: {} };
      }
      goalData[goalId].total++;
      if (trial.outcome === 'SUCCESS') goalData[goalId].successes++;
      if (trial.outcome === 'FAILURE') goalData[goalId].failures++;
      goalData[goalId].prompts[trial.promptLevel] = (goalData[goalId].prompts[trial.promptLevel] || 0) + 1;
    }

    // Get behavior incidents
    const incidents = await prisma.behaviorIncident.findMany({
      where: {
        studentId,
        teacherId,
        timestamp: {
          gte: new Date(), // TODO: Filter by session time range
        },
      },
    });

    const summary = await prisma.sessionSummary.create({
      data: {
        sessionId,
        studentId,
        teacherId,
        station: assignment.station,
        startTime: new Date(),
        endTime: new Date(),
        totalTrials: trials.length,
        goalData: goalData as any,
        notes,
        status: 'DRAFT',
      },
    });

    return summary;
  }

  static async submitSession(summaryId: string) {
    const summary = await prisma.sessionSummary.findUnique({
      where: { id: summaryId },
    });

    if (!summary) {
      throw new Error('Summary not found');
    }

    const updated = await prisma.sessionSummary.update({
      where: { id: summaryId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // TODO: Notify Therapy Coordinator

    return updated;
  }

  static async getSummaries(query: { studentId?: string; teacherId?: string; startDate?: string; endDate?: string }) {
    const where = {
      ...(query.studentId && { studentId: query.studentId }),
      ...(query.teacherId && { teacherId: query.teacherId }),
      ...(query.startDate &&
        query.endDate && {
          startTime: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    const summaries = await prisma.sessionSummary.findMany({
      where,
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
        teacher: {
          select: { firstName: true, lastName: true },
        },
        session: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return summaries;
  }
}
