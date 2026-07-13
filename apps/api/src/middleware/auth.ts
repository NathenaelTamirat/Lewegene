import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@melue/db';
import type { JwtPayload, AuthUser } from '@melue/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Fetch user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, isActive: true },
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
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    // Build effective permissions (union of all roles)
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

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: roleNames,
      permissions: Array.from(permissions),
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next(error);
  }
};

export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((perm) =>
      req.user!.permissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
};

export const requireRole = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const hasRole = requiredRoles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role',
        required: requiredRoles,
      });
    }

    next();
  };
};
