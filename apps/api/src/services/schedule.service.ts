import prisma from '@melue/db';

export class ScheduleService {
  static async listByDate(date: string) {
    const dateObj = new Date(date);
    return prisma.staffSchedule.findMany({
      where: { date: dateObj },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async assign(data: {
    userId: string;
    date: string;
    blockId: string;
    isAvailable?: boolean;
    reason?: string;
  }) {
    const dateObj = new Date(data.date);

    return prisma.staffSchedule.upsert({
      where: {
        userId_date_blockId: {
          userId: data.userId,
          date: dateObj,
          blockId: data.blockId,
        },
      },
      update: {
        isAvailable: data.isAvailable ?? true,
        reason: data.reason,
      },
      create: {
        userId: data.userId,
        date: dateObj,
        blockId: data.blockId,
        isAvailable: data.isAvailable ?? true,
        reason: data.reason,
      },
    });
  }

  static async remove(id: string) {
    return prisma.staffSchedule.delete({ where: { id } });
  }

  static async getUnavailability(date: string) {
    const dateObj = new Date(date);
    return prisma.staffSchedule.findMany({
      where: {
        date: dateObj,
        isAvailable: false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  static async setUnavailability(data: {
    userId: string;
    date: string;
    blockId: string;
    reason?: string;
  }) {
    const dateObj = new Date(data.date);

    return prisma.staffSchedule.upsert({
      where: {
        userId_date_blockId: {
          userId: data.userId,
          date: dateObj,
          blockId: data.blockId,
        },
      },
      update: {
        isAvailable: false,
        reason: data.reason,
      },
      create: {
        userId: data.userId,
        date: dateObj,
        blockId: data.blockId,
        isAvailable: false,
        reason: data.reason,
      },
    });
  }
}
