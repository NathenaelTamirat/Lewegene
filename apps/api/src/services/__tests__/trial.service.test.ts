import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import { TrialService } from '../trial.service';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

describe('TrialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('creates a trial and updates goal progress', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', firstName: 'Emma' });
      mockPrisma.goalAssignment.findUnique
        .mockResolvedValueOnce({
          id: 'ga1',
          status: 'ACTIVE',
          goal: { id: 'g1', type: 'STANDARD' },
        })
        .mockResolvedValueOnce({
          id: 'ga1',
          goal: { type: 'STANDARD' },
          trials: [
            { outcome: 'SUCCESS' },
            { outcome: 'SUCCESS' },
            { outcome: 'FAILURE' },
          ],
        });
      mockPrisma.trial.create.mockResolvedValue({
        id: 't1',
        studentId: 's1',
        goalId: 'ga1',
        outcome: 'SUCCESS',
        goal: {
          goal: { name: 'Turn Taking', type: 'STANDARD' },
        },
      });
      mockPrisma.goalAssignment.update.mockResolvedValue({});

      const result = await TrialService.log(
        {
          studentId: 's1',
          goalId: 'ga1',
          promptLevel: 'INDEPENDENT',
          outcome: 'SUCCESS',
        },
        'teacher-1'
      );

      expect(result).toBeDefined();
      expect(mockPrisma.trial.create).toHaveBeenCalled();
      expect(mockPrisma.goalAssignment.update).toHaveBeenCalled();
    });

    it('throws when student not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(
        TrialService.log(
          { studentId: 'nonexistent', goalId: 'ga1', promptLevel: 'INDEPENDENT', outcome: 'SUCCESS' },
          'teacher-1'
        )
      ).rejects.toThrow('Student not found');
    });

    it('throws when goal assignment not active', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.goalAssignment.findUnique.mockResolvedValue({
        id: 'ga1',
        status: 'MASTERED',
        goal: { type: 'STANDARD' },
      });

      await expect(
        TrialService.log(
          { studentId: 's1', goalId: 'ga1', promptLevel: 'INDEPENDENT', outcome: 'SUCCESS' },
          'teacher-1'
        )
      ).rejects.toThrow('Goal is not active');
    });
  });

  describe('syncTrials', () => {
    it('syncs multiple trials in transaction', async () => {
      const trials = [
        {
          studentId: 's1',
          goalId: 'ga1',
          promptLevel: 'INDEPENDENT',
          outcome: 'SUCCESS' as const,
          timestamp: '2026-07-14T10:00:00Z',
        },
        {
          studentId: 's1',
          goalId: 'ga1',
          promptLevel: 'PARTIAL',
          outcome: 'FAILURE' as const,
          timestamp: '2026-07-14T10:01:00Z',
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      mockPrisma.goalAssignment.findUnique.mockResolvedValue({
        id: 'ga1',
        goal: { type: 'STANDARD' },
        trials: [{ outcome: 'SUCCESS' }, { outcome: 'FAILURE' }],
      });
      mockPrisma.goalAssignment.update.mockResolvedValue({});

      const result = await TrialService.syncTrials(trials, 'teacher-1');

      expect(result).toEqual({ synced: 2 });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateGoalProgress', () => {
    it('calculates standard goal progress correctly', async () => {
      mockPrisma.goalAssignment.findUnique.mockResolvedValue({
        id: 'ga1',
        goal: { type: 'STANDARD' },
        trials: [
          { outcome: 'SUCCESS' },
          { outcome: 'SUCCESS' },
          { outcome: 'SUCCESS' },
          { outcome: 'FAILURE' },
        ],
      });
      mockPrisma.goalAssignment.update.mockResolvedValue({});

      await TrialService.updateGoalProgress('ga1');

      expect(mockPrisma.goalAssignment.update).toHaveBeenCalledWith({
        where: { id: 'ga1' },
        data: expect.objectContaining({
          progress: 75,
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('calculates task analysis progress correctly', async () => {
      mockPrisma.goalAssignment.findUnique.mockResolvedValue({
        id: 'ga1',
        goal: { type: 'TASK_ANALYSIS' },
        trials: [
          { stepId: 'step1', outcome: 'SUCCESS' },
          { stepId: 'step1', outcome: 'SUCCESS' },
          { stepId: 'step2', outcome: 'FAILURE' },
          { stepId: 'step2', outcome: 'FAILURE' },
        ],
      });
      mockPrisma.taskAnalysisStep.findMany.mockResolvedValue([
        { id: 'step1', sortOrder: 1 },
        { id: 'step2', sortOrder: 2 },
      ]);
      mockPrisma.goalAssignment.update.mockResolvedValue({});

      await TrialService.updateGoalProgress('ga1');

      expect(mockPrisma.goalAssignment.update).toHaveBeenCalledWith({
        where: { id: 'ga1' },
        data: expect.objectContaining({
          progress: 50,
          status: 'IN_PROGRESS',
        }),
      });
    });
  });

  describe('getStudentTrials', () => {
    it('returns trials for a student', async () => {
      const trials = [
        {
          id: 't1',
          studentId: 's1',
          outcome: 'SUCCESS',
          goal: { goal: { name: 'Turn Taking' } },
          step: null,
        },
      ];

      mockPrisma.trial.findMany.mockResolvedValue(trials);

      const result = await TrialService.getStudentTrials('s1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.trial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 's1' },
        })
      );
    });

    it('filters by goalId when provided', async () => {
      mockPrisma.trial.findMany.mockResolvedValue([]);

      await TrialService.getStudentTrials('s1', 'ga1');

      expect(mockPrisma.trial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 's1', goalId: 'ga1' },
        })
      );
    });
  });

  describe('getPendingSync', () => {
    it('returns pending sync trials', async () => {
      const trials = [{ id: 't1', syncStatus: 'PENDING' }, { id: 't2', syncStatus: 'PENDING' }];
      mockPrisma.trial.findMany.mockResolvedValue(trials);

      const result = await TrialService.getPendingSync();

      expect(result).toHaveLength(2);
      expect(mockPrisma.trial.findMany).toHaveBeenCalledWith({
        where: { syncStatus: 'PENDING' },
        orderBy: { timestamp: 'asc' },
      });
    });
  });

  describe('markSynced', () => {
    it('marks trials as synced', async () => {
      mockPrisma.trial.updateMany.mockResolvedValue({ count: 3 });

      const result = await TrialService.markSynced(['t1', 't2', 't3']);

      expect(result).toEqual({ synced: 3 });
      expect(mockPrisma.trial.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['t1', 't2', 't3'] } },
        data: { syncStatus: 'SYNCED' },
      });
    });
  });
});
