import prisma from '@melue/db';
import type { CreateStudentInput, UpdateStudentInput, StudentQueryInput } from '@melue/shared';

export class StudentService {
  static async findAll(query: StudentQueryInput) {
    const { search, programType, therapyGroup, status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(programType && { programType }),
      ...(therapyGroup && { therapyGroup }),
      ...(status && { status }),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          programType: true,
          therapyGroup: true,
          status: true,
          station: true,
          headshotUrl: true,
          enrolledAt: true,
          guardianName: true,
          guardianPhone: true,
          goalAssignments: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              goal: { select: { name: true } },
              station: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { enrolledAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    // Calculate age
    const studentsWithAge = students.map((s) => {
      const age = Math.floor(
        (Date.now() - new Date(s.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      return { ...s, age };
    });

    return {
      data: studentsWithAge,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        goalAssignments: {
          where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } },
          include: {
            goal: {
              select: {
                id: true,
                name: true,
                type: true,
                domain: { select: { name: true } },
              },
            },
          },
          orderBy: { station: 'asc' },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            uploadedAt: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const age = Math.floor(
      (Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    return { ...student, age };
  }

  static async create(data: CreateStudentInput, ownerId: string) {
    // Validate age mismatch warning
    const dob = new Date(data.dateOfBirth);
    const age = Math.floor(
      (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    const ageWarning =
      (data.therapyGroup === 'BASIC_THERAPY' && (age < 3 || age > 12)) ||
      (data.therapyGroup === 'FUNCTIONAL_LIVING_SKILLS' && (age < 13 || age > 19));

    const student = await prisma.student.create({
      data: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        dateOfBirth: dob,
        diagnosis: data.diagnosis,
        programType: data.programType,
        therapyGroup: data.therapyGroup,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        guardianEmail: data.guardianEmail,
        ownerId,
        status: 'IN_ASSESSMENT',
      },
    });

    return {
      student,
      ageWarning: ageWarning
        ? `Age ${age} may not be appropriate for ${data.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy (ages 3-12)' : 'Functional Living Skills (ages 13-19)'}`
        : null,
    };
  }

  static async update(id: string, data: UpdateStudentInput) {
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Student not found');
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });

    return student;
  }

  static async updateStatus(id: string, status: string) {
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Student not found');
    }

    const student = await prisma.student.update({
      where: { id },
      data: { status: status as any },
    });

    return student;
  }
}
