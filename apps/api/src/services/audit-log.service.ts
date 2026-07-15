import prisma from '@melue/db';

export class AuditLogService {
  static async list(filters: {
    userId?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entity, startDate, endDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async stats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [byEntity, total, recentCount, recentByDay] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['entity'],
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { timestamp: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: thirtyDaysAgo } },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
    ]);

    return {
      total,
      last30Days: recentCount,
      byEntity: byEntity.map((e: any) => ({ entity: e.entity, count: e._count })),
      recentActions: recentByDay.map((a: any) => ({ action: a.action, count: a._count })),
    };
  }
}
