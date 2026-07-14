import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, requireRole } from '../auth';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

const JWT_SECRET = process.env.JWT_SECRET!;

function createApp(middlewares: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.get('/protected', ...middlewares, (_req, res) => {
    res.json({ success: true, user: (_req as any).user });
  });
  return app;
}

const mockUserWithPermissions = {
  id: 'u1',
  email: 'teacher@melue.com',
  firstName: 'John',
  lastName: 'Doe',
  isActive: true,
  roles: [
    {
      role: {
        name: 'Teacher',
        permissions: [
          { allowed: true, permission: { module: 'goals', action: 'read' } },
          { allowed: true, permission: { module: 'trials', action: 'write' } },
        ],
      },
    },
  ],
};

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches user to req on valid token', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions);

    const app = createApp([authenticate]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('u1');
    expect(res.body.user.permissions).toContain('goals:read');
    expect(res.body.user.roles).toContain('Teacher');
  });

  it('returns 401 when no token', async () => {
    const app = createApp([authenticate]);
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 401 on invalid token', async () => {
    const app = createApp([authenticate]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  it('returns 401 on expired token', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '-1h' });

    const app = createApp([authenticate]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expired');
  });

  it('returns 401 when user not found', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const app = createApp([authenticate]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('User not found or inactive');
  });
});

describe('authorize middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next when user has required permission', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions);

    const app = createApp([authenticate, authorize('goals:read')]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 when user lacks permission', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions);

    const app = createApp([authenticate, authorize('admin:delete')]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  it('returns 401 when user not set', async () => {
    const app = createApp([authorize('goals:read')]);
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Not authenticated');
  });
});

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next when user has required role', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions);

    const app = createApp([authenticate, requireRole('Teacher')]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 when user lacks role', async () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions);

    const app = createApp([authenticate, requireRole('Admin')]);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient role');
  });
});
