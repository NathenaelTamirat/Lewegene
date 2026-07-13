import prisma from '@melue/db';

export class ConfigService {
  static async getByCategory(category: string) {
    const configs = await prisma.systemConfig.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    return configs;
  }

  static async get(key: string) {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    return config;
  }

  static async set(key: string, value: unknown) {
    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: {
        key,
        value: value as any,
        category: key.split('.')[0],
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'update',
        entity: 'SystemConfig',
        entityId: config.id,
        newData: { key, value } as any,
      },
    });

    return config;
  }

  static async setMany(configs: Array<{ key: string; value: unknown; category: string }>) {
    for (const config of configs) {
      await this.set(config.key, config.value);
    }

    return { updated: configs.length };
  }
}
