import prisma from '@melue/db';
import type { LogTrialInput } from '@melue/shared';

export class TrialService {
  static async log(data: LogTrialInput, teacherId: string) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Verify goal assignment exists
    const goalAssignment = await prisma.goalAssignment.findUnique({
      where: { id: data.goalId },
      include: { goal: true },
    });

    if (!goalAssignment) {
      throw new Error('Goal assignment not found');
    }

    if (goalAssignment.status !== 'ACTIVE' && goalAssignment.status !== 'IN_PROGRESS') {
      throw new Error('Goal is not active');
    }

    // If task analysis, verify step exists
    if (data.stepId) {
      const step = await prisma.taskAnalysisStep.findUnique({
        where: { id: data.stepId },
      });

      if (!step) {
        throw new Error('Task analysis step not found');
      }
    }

    // Create trial
    const trial = await prisma.trial.create({
      data: {
        studentId: data.studentId,
        goalId: data.goalId,
        teacherId,
        stepId: data.stepId,
        promptLevel: data.promptLevel,
        outcome: data.outcome,
        notes: data.notes,
        syncStatus: 'PENDING', // Will be synced to server
      },
      include: {
        goal: {
          include: {
            goal: { select: { name: true, type: true } },
          },
        },
      },
    });

    // Update goal progress
    await this.updateGoalProgress(data.goalId);

    return trial;
  }

  static async syncTrials(trials: Array<LogTrialInput & { timestamp: string }>, teacherId: string) {
    const results = await prisma.$transaction(
      trials.map((trial) =>
        prisma.trial.create({
          data: {
            studentId: trial.studentId,
            goalId: trial.goalId,
            teacherId,
            stepId: trial.stepId,
            promptLevel: trial.promptLevel,
            outcome: trial.outcome,
            notes: trial.notes,
            timestamp: new Date(trial.timestamp),
            syncStatus: 'SYNCED',
          },
        })
      )
    );

    // Update progress for all affected goals
    const goalIds = [...new Set(trials.map((t) => t.goalId))];
    for (const goalId of goalIds) {
      await this.updateGoalProgress(goalId);
    }

    return { synced: results.length };
  }

  static async updateGoalProgress(goalAssignmentId: string) {
    const assignment = await prisma.goalAssignment.findUnique({
      where: { id: goalAssignmentId },
      include: {
        goal: true,
        trials: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!assignment) return;

    const goal = assignment.goal;

    if (goal.type === 'STANDARD') {
      // For standard goals, calculate success rate
      const totalTrials = assignment.trials.length;
      const successes = assignment.trials.filter((t: any) => t.outcome === 'SUCCESS').length;
      const progress = totalTrials > 0 ? (successes / totalTrials) * 100 : 0;

      await prisma.goalAssignment.update({
        where: { id: goalAssignmentId },
        data: {
          progress: Math.round(progress * 100) / 100,
          status: progress >= 100 ? 'MASTERED' : 'IN_PROGRESS',
        },
      });
    } else {
      // For task analysis, check step mastery
      const steps = await prisma.taskAnalysisStep.findMany({
        where: { goalId: goal.id },
        orderBy: { sortOrder: 'asc' },
      });

      let masteredSteps = 0;
      for (const step of steps) {
        const stepTrials = assignment.trials.filter((t: any) => t.stepId === step.id);
        const stepSuccesses = stepTrials.filter((t: any) => t.outcome === 'SUCCESS').length;
        const stepProgress = stepTrials.length > 0 ? (stepSuccesses / stepTrials.length) * 100 : 0;

        if (stepProgress >= 80) {
          masteredSteps++;
        }
      }

      const overallProgress = steps.length > 0 ? (masteredSteps / steps.length) * 100 : 0;

      await prisma.goalAssignment.update({
        where: { id: goalAssignmentId },
        data: {
          progress: Math.round(overallProgress * 100) / 100,
          status: masteredSteps === steps.length ? 'MASTERED' : 'IN_PROGRESS',
        },
      });
    }
  }

  static async getStudentTrials(studentId: string, goalId?: string) {
    const where = {
      studentId,
      ...(goalId && { goalId }),
    };

    const trials = await prisma.trial.findMany({
      where,
      include: {
        goal: {
          include: {
            goal: { select: { name: true } },
          },
        },
        step: {
          select: { name: true, sortOrder: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return trials;
  }

  static async getPendingSync() {
    const trials = await prisma.trial.findMany({
      where: { syncStatus: 'PENDING' },
      orderBy: { timestamp: 'asc' },
    });

    return trials;
  }

  static async markSynced(ids: string[]) {
    await prisma.trial.updateMany({
      where: { id: { in: ids } },
      data: { syncStatus: 'SYNCED' },
    });

    return { synced: ids.length };
  }
}
