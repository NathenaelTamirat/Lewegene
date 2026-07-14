import prisma from '@melue/db';

export class MasteryCheckService {
  static async getEligibleGoals() {
    const assignments = await prisma.goalAssignment.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        progress: { gte: 80 },
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            masteryCriteria: true,
          },
        },
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        trials: {
          select: { outcome: true },
        },
      },
    });

    const eligible = assignments
      .map((a) => {
        const totalTrials = a.trials.length;
        const successes = a.trials.filter((t) => t.outcome === 'SUCCESS').length;
        const independence = totalTrials > 0 ? Math.round((successes / totalTrials) * 100) : 0;

        const criteria = (a.goal.masteryCriteria as any) || {};
        const threshold = criteria.threshold || 80;

        if (independence >= threshold) {
          return {
            goalId: a.goal.id,
            goalName: a.goal.name,
            studentId: a.student.id,
            studentName: `${a.student.firstName} ${a.student.lastName}`,
            independence,
            totalTrials,
            successes,
          };
        }
        return null;
      })
      .filter(Boolean);

    return eligible;
  }

  static async getChecks(status?: string) {
    const where = status ? { status: status as any } : {};

    const checks = await prisma.masteryCheck.findMany({
      where,
      include: {
        goalAssignment: {
          include: {
            goal: { select: { name: true } },
            student: { select: { firstName: true, lastName: true } },
            trials: { select: { outcome: true, promptLevel: true } },
          },
        },
        primaryTeacher: { select: { firstName: true, lastName: true } },
        verifierB: { select: { firstName: true, lastName: true } },
        verifierC: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return checks.map((c) => {
      const totalTrials = c.goalAssignment.trials.length;
      const successes = c.goalAssignment.trials.filter((t) => t.outcome === 'SUCCESS').length;
      const independence = totalTrials > 0 ? Math.round((successes / totalTrials) * 100) : 0;

      const teacherAData = c.teacherASummary as any;
      const verifierBData = c.verifierBData as any;
      const verifierCData = c.verifierCData as any;

      return {
        id: c.id,
        goalName: c.goalAssignment.goal.name,
        studentName: `${c.goalAssignment.student.firstName} ${c.goalAssignment.student.lastName}`,
        status: c.status,
        independence,
        totalTrials,
        successes,
        primaryTeacher: `${c.primaryTeacher.firstName} ${c.primaryTeacher.lastName}`,
        verifierA: verifierBData
          ? {
              name: `${c.verifierB!.firstName} ${c.verifierB!.lastName}`,
              outcome: verifierBData.outcome,
              notes: verifierBData.notes,
            }
          : null,
        verifierB: verifierCData
          ? {
              name: `${c.verifierC!.firstName} ${c.verifierC!.lastName}`,
              outcome: verifierCData.outcome,
              notes: verifierCData.notes,
            }
          : null,
        approver: c.approver
          ? `${c.approver.firstName} ${c.approver.lastName}`
          : null,
        approvedAt: c.approvedAt?.toISOString() || null,
        rejectedAt: c.status === 'REJECTED' ? c.approvedAt?.toISOString() || null : null,
        rejectionReason: c.status === 'REJECTED' ? c.approvalNotes : null,
      };
    });
  }

  static async initiate(data: { goalId: string; studentId: string }, teacherId: string) {
    const assignment = await prisma.goalAssignment.findFirst({
      where: {
        goalId: data.goalId,
        studentId: data.studentId,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
    });

    if (!assignment) {
      throw new Error('Goal assignment not found');
    }

    const totalTrials = await prisma.trial.count({
      where: { goalId: assignment.id },
    });

    const existing = await prisma.masteryCheck.findFirst({
      where: {
        goalAssignmentId: assignment.id,
        status: { in: ['PENDING_VERIFICATION', 'PENDING_APPROVAL'] },
      },
    });

    if (existing) {
      throw new Error('A mastery check is already in progress for this goal');
    }

    const check = await prisma.masteryCheck.create({
      data: {
        goalAssignmentId: assignment.id,
        primaryTeacherId: teacherId,
        status: 'PENDING_VERIFICATION',
        teacherASummary: {
          totalTrials,
          confirmed: true,
          timestamp: new Date().toISOString(),
        },
      },
      include: {
        goalAssignment: {
          include: {
            goal: { select: { name: true } },
            student: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      id: check.id,
      goalName: check.goalAssignment.goal.name,
      studentName: `${check.goalAssignment.student.firstName} ${check.goalAssignment.student.lastName}`,
      status: check.status,
    };
  }

  static async verify(checkId: string, data: { outcome: string; notes?: string }, verifierId: string) {
    const check = await prisma.masteryCheck.findUnique({
      where: { id: checkId },
    });

    if (!check) {
      throw new Error('Mastery check not found');
    }

    const hasVerifierB = !!check.verifierBId;
    const hasVerifierC = !!check.verifierCId;

    if (!hasVerifierB) {
      await prisma.masteryCheck.update({
        where: { id: checkId },
        data: {
          verifierBId: verifierId,
          verifierBData: { outcome: data.outcome, notes: data.notes },
          status: hasVerifierC ? 'PENDING_APPROVAL' : 'PENDING_VERIFICATION',
        },
      });
    } else if (!hasVerifierC) {
      await prisma.masteryCheck.update({
        where: { id: checkId },
        data: {
          verifierCId: verifierId,
          verifierCData: { outcome: data.outcome, notes: data.notes },
          status: 'PENDING_APPROVAL',
        },
      });
    } else {
      throw new Error('All verifiers have already submitted');
    }

    return { message: 'Verification submitted' };
  }

  static async approve(checkId: string, data: { decision: string; reason?: string }, approverId: string) {
    const check = await prisma.masteryCheck.findUnique({
      where: { id: checkId },
    });

    if (!check) {
      throw new Error('Mastery check not found');
    }

    if (check.status !== 'PENDING_APPROVAL') {
      throw new Error('Mastery check is not ready for approval');
    }

    const isApproved = data.decision === 'APPROVE';

    await prisma.masteryCheck.update({
      where: { id: checkId },
      data: {
        approverId,
        status: isApproved ? 'APPROVED' : 'REJECTED',
        approvalNotes: data.reason,
        approvedAt: new Date(),
      },
    });

    if (isApproved) {
      await prisma.goalAssignment.update({
        where: { id: check.goalAssignmentId },
        data: {
          status: 'MASTERED',
          masteredAt: new Date(),
        },
      });
    }

    return { message: isApproved ? 'Goal mastered!' : 'Mastery check rejected' };
  }
}
