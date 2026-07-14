import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import { SessionService } from '../session.service';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveBlock', () => {
    it('returns current active session block', async () => {
      const block = {
        id: 'sb1',
        name: 'Morning Session',
        startTime: new Date('2026-07-14T08:00:00Z'),
        endTime: new Date('2026-07-14T12:00:00Z'),
        assignments: [
          {
            teacher: { id: 't1', firstName: 'John', lastName: 'Doe' },
            student: { id: 's1', firstName: 'Emma', lastName: 'Wilson', headshotUrl: null },
          },
        ],
      };

      mockPrisma.sessionBlock.findFirst.mockResolvedValue(block);

      const result = await SessionService.getActiveBlock();

      expect(result).toEqual(block);
      expect(mockPrisma.sessionBlock.findFirst).toHaveBeenCalled();
    });

    it('returns null when no active block', async () => {
      mockPrisma.sessionBlock.findFirst.mockResolvedValue(null);

      const result = await SessionService.getActiveBlock();

      expect(result).toBeNull();
    });
  });

  describe('getTeacherAssignments', () => {
    it('returns teacher assignments', async () => {
      const assignments = [
        {
          id: 'sa1',
          sessionId: 'sb1',
          teacherId: 't1',
          studentId: 's1',
          session: { id: 'sb1', name: 'Morning Session' },
          student: { id: 's1', firstName: 'Emma', lastName: 'Wilson', headshotUrl: null },
        },
      ];

      mockPrisma.sessionAssignment.findMany.mockResolvedValue(assignments);

      const result = await SessionService.getTeacherAssignments('t1', 'sb1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.sessionAssignment.findMany).toHaveBeenCalled();
    });
  });

  describe('getBlockSummary', () => {
    it('returns session summary with incidents', async () => {
      const block = {
        id: 'sb1',
        name: 'Morning Session',
        startTime: new Date('2026-07-14T08:00:00Z'),
        endTime: new Date('2026-07-14T12:00:00Z'),
      };

      const summaries = [
        {
          id: 'ss1',
          sessionId: 'sb1',
          station: 'STATION_1',
          status: 'SUBMITTED',
          goalData: { ga1: { total: 10, successes: 8 } },
          student: { id: 's1', firstName: 'Emma', lastName: 'Wilson' },
          teacher: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      mockPrisma.sessionBlock.findUnique.mockResolvedValue(block);
      mockPrisma.sessionSummary.findMany.mockResolvedValue(summaries);
      mockPrisma.behaviorIncident.findMany.mockResolvedValue([]);

      const result = await SessionService.getBlockSummary('sb1');

      expect(result.id).toBe('sb1');
      expect(result.assignments).toHaveLength(1);
      expect(result.incidents).toEqual([]);
    });

    it('throws when block not found', async () => {
      mockPrisma.sessionBlock.findUnique.mockResolvedValue(null);

      await expect(SessionService.getBlockSummary('nonexistent')).rejects.toThrow(
        'Session block not found'
      );
    });
  });

  describe('submitBlockSummary', () => {
    it('creates or updates summary as SUBMITTED', async () => {
      mockPrisma.sessionSummary.findFirst.mockResolvedValue(null);
      mockPrisma.sessionSummary.create.mockResolvedValue({
        id: 'ss-new',
        sessionId: 'sb1',
        teacherId: 't1',
        status: 'SUBMITTED',
      });

      const result = await SessionService.submitBlockSummary('sb1', 't1', 'Good session');

      expect(result.status).toBe('SUBMITTED');
      expect(mockPrisma.sessionSummary.create).toHaveBeenCalled();
    });

    it('updates existing summary', async () => {
      const existing = { id: 'ss1', sessionId: 'sb1', teacherId: 't1', notes: 'Old notes' };
      mockPrisma.sessionSummary.findFirst.mockResolvedValue(existing);
      mockPrisma.sessionSummary.update.mockResolvedValue({
        ...existing,
        status: 'SUBMITTED',
        notes: 'Updated notes',
      });

      const result = await SessionService.submitBlockSummary('sb1', 't1', 'Updated notes');

      expect(result.status).toBe('SUBMITTED');
      expect(mockPrisma.sessionSummary.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ss1' },
          data: expect.objectContaining({ status: 'SUBMITTED' }),
        })
      );
    });
  });

  describe('saveDraftSummary', () => {
    it('creates or updates summary as DRAFT', async () => {
      mockPrisma.sessionSummary.findFirst.mockResolvedValue(null);
      mockPrisma.sessionSummary.create.mockResolvedValue({
        id: 'ss-draft',
        sessionId: 'sb1',
        teacherId: 't1',
        status: 'DRAFT',
      });

      const result = await SessionService.saveDraftSummary('sb1', 't1', 'Draft notes');

      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.sessionSummary.create).toHaveBeenCalled();
    });
  });

  describe('submitSummary', () => {
    it('creates summary with trial data', async () => {
      mockPrisma.sessionAssignment.findFirst.mockResolvedValue({
        id: 'sa1',
        station: 'STATION_1',
      });
      mockPrisma.trial.findMany.mockResolvedValue([
        {
          id: 't1',
          goalId: 'ga1',
          outcome: 'SUCCESS',
          promptLevel: 'INDEPENDENT',
          goal: { goal: { name: 'Turn Taking' } },
        },
      ]);
      mockPrisma.behaviorIncident.findMany.mockResolvedValue([]);
      mockPrisma.sessionSummary.create.mockResolvedValue({
        id: 'ss1',
        sessionId: 'sb1',
        studentId: 's1',
        teacherId: 't1',
        status: 'DRAFT',
      });

      const result = await SessionService.submitSummary('sb1', 's1', 't1');

      expect(result).toBeDefined();
      expect(mockPrisma.sessionSummary.create).toHaveBeenCalled();
    });
  });

  describe('getSummaries', () => {
    it('returns filtered summaries', async () => {
      mockPrisma.sessionSummary.findMany.mockResolvedValue([
        {
          id: 'ss1',
          sessionId: 'sb1',
          student: { firstName: 'Emma', lastName: 'Wilson' },
          teacher: { firstName: 'John', lastName: 'Doe' },
          session: { id: 'sb1' },
        },
      ]);

      const result = await SessionService.getSummaries({
        studentId: 's1',
        teacherId: 't1',
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.sessionSummary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 's1',
            teacherId: 't1',
          }),
        })
      );
    });
  });
});
