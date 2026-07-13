import prisma from '@melue/db';
import type { CreateAssessmentInput } from '@melue/shared';

export class AssessmentService {
  static async create(data: CreateAssessmentInput) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const assessment = await prisma.assessment.create({
      data: {
        studentId: data.studentId,
        type: data.type,
        status: 'DRAFT',
        data: {},
      },
    });

    return assessment;
  }

  static async findByStudent(studentId: string) {
    const assessments = await prisma.assessment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return assessments;
  }

  static async update(id: string, data: Record<string, unknown>) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        data: data as any,
        status: 'IN_PROGRESS',
      },
    });

    return updated;
  }

  static async complete(id: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'COMPLETE',
        completedAt: new Date(),
      },
    });

    // Check if all required assessments are complete
    await this.checkCompletionStatus(assessment.studentId);

    return updated;
  }

  static async review(id: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        reviewedAt: new Date(),
      },
    });

    return updated;
  }

  static async checkCompletionStatus(studentId: string) {
    const assessments = await prisma.assessment.findMany({
      where: {
        studentId,
        type: { in: ['SKILLS_ABLLS', 'BEHAVIOR_MASS', 'BEHAVIOR_FAST', 'PREFERENCE'] },
      },
    });

    const requiredTypes = ['SKILLS_ABLLS', 'BEHAVIOR_MASS', 'PREFERENCE'];
    const completedTypes = assessments
      .filter((a) => a.status === 'COMPLETE' || a.status === 'REVIEWED')
      .map((a) => a.type);

    const allComplete = requiredTypes.every((type) => completedTypes.includes(type as any));

    if (allComplete) {
      await prisma.student.update({
        where: { id: studentId },
        data: { status: 'ASSESSMENT_COMPLETE' },
      });
    }
  }
}
