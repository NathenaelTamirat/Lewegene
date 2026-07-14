import prisma from '@melue/db';
import type { CreateBehaviorIncidentInput } from '@melue/shared';

export class BehaviorIncidentService {
  static async create(data: CreateBehaviorIncidentInput, teacherId: string) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const incident = await prisma.behaviorIncident.create({
      data: {
        studentId: data.studentId,
        teacherId,
        behaviorName: data.behaviorName,
        category: data.category,
        frequency: data.frequency,
        intensity: data.intensity,
        location: data.location,
        antecedent: data.antecedent,
        consequence: data.consequence,
        notes: data.notes,
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
      },
    });

    return incident;
  }

  static async findByStudent(studentId: string) {
    const incidents = await prisma.behaviorIncident.findMany({
      where: { studentId },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return incidents;
  }

  static async findAll(query: { studentId?: string; teacherId?: string; startDate?: string; endDate?: string }) {
    const where = {
      ...(query.studentId && { studentId: query.studentId }),
      ...(query.teacherId && { teacherId: query.teacherId }),
      ...(query.startDate && query.endDate && {
        timestamp: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      }),
    };

    const incidents = await prisma.behaviorIncident.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return incidents;
  }

  static async delete(id: string) {
    const incident = await prisma.behaviorIncident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    await prisma.behaviorIncident.delete({ where: { id } });
    return { message: 'Incident deleted successfully' };
  }
}
