import { vi } from 'vitest';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  student: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  goal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  goalAssignment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  goalDomain: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  trial: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  taskAnalysisStep: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  masteryCheck: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  sessionBlock: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  sessionAssignment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  sessionSummary: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  behaviorIncident: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  assessment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  homeObservation: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  parentUser: {
    findUnique: vi.fn(),
  },
  role: {
    findMany: vi.fn(),
  },
  systemConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((fns: any[]) => Promise.all(fns)),
};

vi.mock('@melue/db', () => ({
  default: mockPrisma,
}));

// Set test env vars
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

export { mockPrisma };
