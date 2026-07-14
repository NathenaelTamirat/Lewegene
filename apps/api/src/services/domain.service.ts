import prisma from '@melue/db';

export class DomainService {
  static async list() {
    return prisma.goalDomain.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { goals: true } } },
    });
  }

  static async create(data: { name: string; description?: string; sortOrder?: number }) {
    return prisma.goalDomain.create({ data });
  }

  static async update(id: string, data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const domain = await prisma.goalDomain.findUnique({ where: { id } });
    if (!domain) throw new Error('Domain not found');
    return prisma.goalDomain.update({ where: { id }, data });
  }

  static async remove(id: string) {
    const domain = await prisma.goalDomain.findUnique({ where: { id }, include: { _count: { select: { goals: true } } } });
    if (!domain) throw new Error('Domain not found');
    if (domain._count.goals > 0) throw new Error('Cannot delete domain with assigned goals');
    return prisma.goalDomain.delete({ where: { id } });
  }
}
