import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@melue/db';
import type { JwtPayload } from '@melue/shared';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await this.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Build permissions
    const permissions = new Set<string>();
    const roleNames: string[] = [];

    for (const ur of user.roles) {
      roleNames.push(ur.role.name);
      for (const rp of ur.role.permissions) {
        if (rp.allowed) {
          permissions.add(`${rp.permission.module}:${rp.permission.action}`);
        }
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      roles: roleNames,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
        permissions: Array.from(permissions),
      },
      token,
    };
  }

  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });

    // Assign default Teacher role
    const teacherRole = await prisma.role.findUnique({
      where: { name: 'Teacher' },
    });

    if (teacherRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: teacherRole.id,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account exists, a reset link has been sent' };
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, just log it
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If an account exists, a reset link has been sent' };
  }

  static async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      const passwordHash = await this.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash },
      });

      return { message: 'Password reset successful' };
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }
  }
}
