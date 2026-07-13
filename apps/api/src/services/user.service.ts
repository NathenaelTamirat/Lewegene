import prisma from '@melue/db';
import { AuthService } from './auth.service';
import type { CreateUserInput, UpdateUserInput, PaginationInput } from '@melue/shared';

export class UserService {
  static async findAll(query: PaginationInput & { search?: string; isActive?: boolean }) {
    const { page, limit, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...u,
        roles: u.roles.map((ur) => ur.role),
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        module: true,
                        action: true,
                      },
                    },
                    allowed: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Flatten permissions
    const permissions = new Set<string>();
    const roles = user.roles.map((ur) => {
      for (const rp of ur.role.permissions) {
        if (rp.allowed) {
          permissions.add(`${rp.permission.module}:${rp.permission.action}`);
        }
      }
      return { id: ur.role.id, name: ur.role.name };
    });

    return {
      ...user,
      roles,
      permissions: Array.from(permissions),
    };
  }

  static async create(data: CreateUserInput) {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(data.password);

    // Create user with roles
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roles: {
          create: data.roleIds.map((roleId) => ({
            roleId,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async update(id: string, data: UpdateUserInput) {
    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('User not found');
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailTaken) {
        throw new Error('Email already exists');
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async deactivate(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  static async resetPassword(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = await AuthService.forgotPassword(user.email);

    return resetToken;
  }
}
