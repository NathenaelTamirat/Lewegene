import prisma from '@melue/db';
import type { CreateRoleInput, UpdateRoleInput } from '@melue/shared';

export class RoleService {
  static async findAll() {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      userCount: role._count.users,
      permissions: role.permissions
        .filter((rp) => rp.allowed)
        .map((rp) => `${rp.permission.module}:${rp.permission.action}`),
      _count: undefined,
    }));
  }

  static async findById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    return {
      ...role,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        module: rp.permission.module,
        action: rp.permission.action,
        allowed: rp.allowed,
      })),
      _count: undefined,
    };
  }

  static async create(data: CreateRoleInput) {
    // Check name uniqueness
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Role name already exists');
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissionIds
          ? {
              create: data.permissionIds.map((permissionId) => ({
                permissionId,
                allowed: true,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      ...role,
      permissions: role.permissions
        .filter((rp) => rp.allowed)
        .map((rp) => `${rp.permission.module}:${rp.permission.action}`),
    };
  }

  static async update(id: string, data: UpdateRoleInput) {
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (!role.isDeletable) {
      throw new Error('Cannot modify system-critical role');
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== role.name) {
      const nameTaken = await prisma.role.findUnique({
        where: { name: data.name },
      });

      if (nameTaken) {
        throw new Error('Role name already exists');
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    return updated;
  }

  static async delete(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (!role.isDeletable) {
      throw new Error('Cannot delete system-critical role');
    }

    if (role._count.users > 0) {
      throw new Error('Cannot delete role with active users. Remove users from this role first.');
    }

    await prisma.role.delete({ where: { id } });

    return { message: 'Role deleted successfully' };
  }

  static async updatePermissions(roleId: string, permissionIds: string[]) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
        allowed: true,
      })),
    });

    return { message: 'Permissions updated successfully' };
  }

  static async getAllPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    return permissions;
  }
}
