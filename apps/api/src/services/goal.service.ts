import prisma from '@melue/db';
import type { CreateGoalInput, UpdateGoalInput, AssignGoalInput, PaginationInput } from '@melue/shared';

export class GoalService {
  static async findAll(query: PaginationInput & { search?: string; domainId?: string; isActive?: boolean }) {
    const { page, limit, search, domainId, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(domainId && { domainId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        include: {
          domain: { select: { id: true, name: true } },
          _count: {
            select: {
              assignments: {
                where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.goal.count({ where }),
    ]);

    return {
      data: goals.map((g: any) => ({
        ...g,
        usageCount: g._count.assignments,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(id: string) {
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        domain: true,
        taskAnalysisSteps: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            assignments: {
              where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
            },
          },
        },
      },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    return {
      ...goal,
      usageCount: goal._count.assignments,
      _count: undefined,
    };
  }

  static async create(data: CreateGoalInput) {
    const goal = await prisma.goal.create({
      data: {
        name: data.name,
        domainId: data.domainId,
        description: data.description,
        type: data.type,
        suggestedAgeMin: data.suggestedAgeMin,
        suggestedAgeMax: data.suggestedAgeMax,
        masteryCriteria: data.masteryCriteria,
      },
      include: {
        domain: { select: { name: true } },
      },
    });

    return goal;
  }

  static async update(id: string, data: UpdateGoalInput) {
    const existing = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    const goal = await prisma.goal.update({
      where: { id },
      data,
      include: {
        domain: { select: { name: true } },
      },
    });

    return goal;
  }

  static async deactivate(id: string) {
    const existing = await prisma.goal.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: {
              where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    await prisma.goal.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Goal deactivated successfully' };
  }

  static async delete(id: string) {
    const existing = await prisma.goal.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: {
              where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Goal not found');
    }

    if (existing._count.assignments > 0) {
      throw new Error('Cannot delete goal with active student assignments');
    }

    await prisma.goal.delete({ where: { id } });

    return { message: 'Goal deleted successfully' };
  }

  static async assignToStudent(data: AssignGoalInput) {
    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Check if goal exists
    const goal = await prisma.goal.findUnique({
      where: { id: data.goalId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Check capacity (max 2 goals per station)
    const existingCount = await prisma.goalAssignment.count({
      where: {
        studentId: data.studentId,
        station: data.station,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
    });

    if (existingCount >= 2) {
      throw new Error('Station already has 2 active goals. Replace an existing goal first.');
    }

    // Check for duplicate assignment
    const duplicate = await prisma.goalAssignment.findFirst({
      where: {
        studentId: data.studentId,
        goalId: data.goalId,
        station: data.station,
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
      },
    });

    if (duplicate) {
      throw new Error('Goal is already assigned to this student at this station');
    }

    const assignment = await prisma.goalAssignment.create({
      data: {
        studentId: data.studentId,
        goalId: data.goalId,
        station: data.station,
        iupId: data.iupId,
        notes: data.notes,
        status: 'ACTIVE',
      },
      include: {
        goal: { select: { name: true, type: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    });

    return assignment;
  }

  static async removeFromStudent(assignmentId: string) {
    const existing = await prisma.goalAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      throw new Error('Goal assignment not found');
    }

    await prisma.goalAssignment.update({
      where: { id: assignmentId },
      data: { status: 'REMOVED' },
    });

    return { message: 'Goal removed from student' };
  }

  static async getTaskSteps(goalId: string) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    const steps = await prisma.taskAnalysisStep.findMany({
      where: { goalId },
      orderBy: { sortOrder: 'asc' },
    });

    return steps;
  }

  static async getStudentCaseload(studentId: string) {
    const assignments = await prisma.goalAssignment.findMany({
      where: {
        studentId,
        status: { in: ['ACTIVE', 'IN_PROGRESS', 'MASTERED'] },
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            type: true,
            domain: { select: { name: true } },
          },
        },
        _count: {
          select: {
            trials: true,
          },
        },
      },
      orderBy: [{ station: 'asc' }, { assignedAt: 'desc' }],
    });

    // Group by station
    const byStation = {
      STATION_1: assignments.filter((a: any) => a.station === 'STATION_1'),
      STATION_2: assignments.filter((a: any) => a.station === 'STATION_2'),
    };

    return byStation;
  }
}
