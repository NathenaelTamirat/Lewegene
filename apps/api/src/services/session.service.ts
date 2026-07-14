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

  static async getBlockSummary(sessionId: string) {
    const block = await prisma.sessionBlock.findUnique({
      where: { id: sessionId },
    });

    if (!block) {
      throw new Error('Session block not found');
    }

    const summaries = await prisma.sessionSummary.findMany({
      where: { sessionId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        teacher: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const incidents = await prisma.behaviorIncident.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
    });

    const assignment = summaries[0];
    return {
      id: block.id,
      name: block.name,
      station: assignment?.station || block.name,
      startTime: block.startTime,
      endTime: block.endTime,
      status: assignment?.status || 'IN_PROGRESS',
      teacher: assignment?.teacher || { firstName: '', lastName: '' },
      assignments: summaries.map((s) => ({
        student: s.student,
        goals: (s.goalData as any) || {},
      })),
      incidents,
    };
  }

  static async submitBlockSummary(sessionId: string, teacherId: string, notes?: string) {
    const existing = await prisma.sessionSummary.findFirst({
      where: { sessionId, teacherId },
    });

    if (existing) {
      const updated = await prisma.sessionSummary.update({
        where: { id: existing.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          notes: notes || existing.notes,
        },
      });
      return updated;
    }

    const summary = await prisma.sessionSummary.create({
      data: {
        sessionId,
        studentId: '',
        teacherId,
        station: 'STATION_1',
        startTime: new Date(),
        endTime: new Date(),
        totalTrials: 0,
        goalData: {},
        notes,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return summary;
  }

  static async saveDraftSummary(sessionId: string, teacherId: string, notes?: string) {
    const existing = await prisma.sessionSummary.findFirst({
      where: { sessionId, teacherId },
    });

    if (existing) {
      const updated = await prisma.sessionSummary.update({
        where: { id: existing.id },
        data: { notes: notes || existing.notes },
      });
      return updated;
    }

    const summary = await prisma.sessionSummary.create({
      data: {
        sessionId,
        studentId: '',
        teacherId,
        station: 'STATION_1',
        startTime: new Date(),
        endTime: new Date(),
        totalTrials: 0,
        goalData: {},
        notes,
        status: 'DRAFT',
      },
    });

    return summary;
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
