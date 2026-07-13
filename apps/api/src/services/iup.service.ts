import prisma from '@melue/db';
import type { CreateIUPInput, FinalizeIUPInput } from '@melue/shared';

// Default 12-section IUP template
const DEFAULT_IUP_TEMPLATE = {
  sections: [
    { id: 1, name: 'Student Info', readOnly: true },
    { id: 2, name: 'Assessment Summary', readOnly: true },
    { id: 3, name: 'Reinforcement Strategies', readOnly: false },
    { id: 4, name: 'Consequence Strategies', readOnly: false },
    { id: 5, name: 'Family Participation Plan', readOnly: false },
    { id: 6, name: 'Behavior Reduction Protocol', readOnly: false },
    { id: 7, name: 'Replacement Behavior Goals', readOnly: false },
    { id: 8, name: 'Antecedent Manipulations', readOnly: false },
    { id: 9, name: 'Crisis Plan', readOnly: false },
    { id: 10, name: 'Coordination of Care', readOnly: false },
    { id: 11, name: 'Discharge Criteria', readOnly: false },
    { id: 12, name: 'Signatures', readOnly: true },
  ],
};

export class IUPService {
  static async create(data: CreateIUPInput) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const iup = await prisma.iUP.create({
      data: {
        studentId: data.studentId,
        status: 'DRAFT',
        data: DEFAULT_IUP_TEMPLATE,
      },
    });

    return iup;
  }

  static async findByStudent(studentId: string) {
    const iups = await prisma.iUP.findMany({
      where: { studentId },
      include: {
        goalAssignments: {
          include: {
            goal: { select: { name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return iups;
  }

  static async findById(id: string) {
    const iup = await prisma.iUP.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            diagnosis: true,
            programType: true,
            therapyGroup: true,
          },
        },
        goalAssignments: {
          include: {
            goal: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
                domain: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!iup) {
      throw new Error('IUP not found');
    }

    return iup;
  }

  static async update(id: string, data: Record<string, unknown>) {
    const iup = await prisma.iUP.findUnique({
      where: { id },
    });

    if (!iup) {
      throw new Error('IUP not found');
    }

    if (iup.status !== 'DRAFT') {
      throw new Error('Can only edit draft IUPs');
    }

    const updated = await prisma.iUP.update({
      where: { id },
      data: {
        data: data as any,
      },
    });

    return updated;
  }

  static async assignGoals(iupId: string, assignments: FinalizeIUPInput['goalAssignments']) {
    const iup = await prisma.iUP.findUnique({
      where: { id: iupId },
    });

    if (!iup) {
      throw new Error('IUP not found');
    }

    if (iup.status !== 'DRAFT') {
      throw new Error('Can only assign goals to draft IUPs');
    }

    // Remove existing assignments
    await prisma.goalAssignment.deleteMany({
      where: { iupId },
    });

    // Create new assignments
    for (const assignment of assignments) {
      await prisma.goalAssignment.create({
        data: {
          studentId: iup.studentId,
          goalId: assignment.goalId,
          station: assignment.station,
          iupId,
          notes: assignment.notes,
          status: 'ACTIVE',
        },
      });
    }

    return { message: 'Goals assigned successfully' };
  }

  static async finalize(id: string) {
    const iup = await prisma.iUP.findUnique({
      where: { id },
      include: {
        goalAssignments: true,
      },
    });

    if (!iup) {
      throw new Error('IUP not found');
    }

    if (iup.status !== 'DRAFT') {
      throw new Error('Can only finalize draft IUPs');
    }

    // Check if at least one goal is assigned
    if (iup.goalAssignments.length === 0) {
      throw new Error('At least one goal must be assigned before finalizing');
    }

    // Finalize IUP
    const updated = await prisma.iUP.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        finalizedAt: new Date(),
      },
    });

    // Update student status
    await prisma.student.update({
      where: { id: iup.studentId },
      data: { status: 'ACTIVE_THERAPY' },
    });

    return updated;
  }

  static async archive(id: string) {
    const iup = await prisma.iUP.findUnique({
      where: { id },
    });

    if (!iup) {
      throw new Error('IUP not found');
    }

    if (iup.status !== 'ACTIVE') {
      throw new Error('Can only archive active IUPs');
    }

    const updated = await prisma.iUP.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    return updated;
  }

  static async getAll() {
    const iups = await prisma.iUP.findMany({
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            goalAssignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return iups;
  }
}
