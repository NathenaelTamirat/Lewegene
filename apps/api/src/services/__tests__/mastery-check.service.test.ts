import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import { MasteryCheckService } from '../mastery-check.service';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

describe('MasteryCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEligibleGoals', () => {
    it('returns goals that meet threshold', async () => {
      const assignments = [
        {
          goal: { id: 'g1', name: 'Turn Taking', masteryCriteria: { threshold: 80 } },
          student: { id: 's1', firstName: 'Emma', lastName: 'Wilson' },
          trials: [
            { outcome: 'SUCCESS' },
            { outcome: 'SUCCESS' },
            { outcome: 'SUCCESS' },
            { outcome: 'SUCCESS' },
            { outcome: 'FAILURE' },
          ],
        },
      ];

      mockPrisma.goalAssignment.findMany.mockResolvedValue(assignments);

      const result = await MasteryCheckService.getEligibleGoals();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        goalId: 'g1',
        goalName: 'Turn Taking',
        studentId: 's1',
        studentName: 'Emma Wilson',
        independence: 80,
        totalTrials: 5,
        successes: 4,
      });
    });

    it('filters out goals below threshold', async () => {
      const assignments = [
        {
          goal: { id: 'g1', name: 'Hard Goal', masteryCriteria: { threshold: 90 } },
          student: { id: 's1', firstName: 'Emma', lastName: 'Wilson' },
          trials: [
            { outcome: 'SUCCESS' },
            { outcome: 'FAILURE' },
            { outcome: 'FAILURE' },
          ],
        },
      ];

      mockPrisma.goalAssignment.findMany.mockResolvedValue(assignments);

      const result = await MasteryCheckService.getEligibleGoals();

      expect(result).toHaveLength(0);
    });
  });

  describe('getChecks', () => {
    it('returns checks with status filter', async () => {
      const checks = [
        {
          id: 'mc1',
          status: 'PENDING_VERIFICATION',
          teacherASummary: { totalTrials: 20, confirmed: true },
          verifierBData: null,
          verifierCData: null,
          approvedAt: null,
          approvalNotes: null,
          goalAssignment: {
            goal: { name: 'Turn Taking' },
            student: { firstName: 'Emma', lastName: 'Wilson' },
            trials: [
              { outcome: 'SUCCESS', promptLevel: 'INDEPENDENT' },
              { outcome: 'SUCCESS', promptLevel: 'INDEPENDENT' },
            ],
          },
          primaryTeacher: { firstName: 'John', lastName: 'Doe' },
          verifierB: null,
          verifierC: null,
          approver: null,
        },
      ];

      mockPrisma.masteryCheck.findMany.mockResolvedValue(checks);

      const result = await MasteryCheckService.getChecks('PENDING_VERIFICATION');

      expect(mockPrisma.masteryCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING_VERIFICATION' },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING_VERIFICATION');
      expect(result[0].independence).toBe(100);
    });

    it('returns all checks when no status filter', async () => {
      mockPrisma.masteryCheck.findMany.mockResolvedValue([]);

      await MasteryCheckService.getChecks();

      expect(mockPrisma.masteryCheck.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe('initiate', () => {
    it('creates a new mastery check', async () => {
      const assignment = { id: 'ga1', goalId: 'g1', studentId: 's1', status: 'ACTIVE' };

      mockPrisma.goalAssignment.findFirst.mockResolvedValue(assignment);
      mockPrisma.trial.count.mockResolvedValue(15);
      mockPrisma.masteryCheck.findFirst.mockResolvedValue(null);
      mockPrisma.masteryCheck.create.mockResolvedValue({
        id: 'mc1',
        goalAssignment: {
          goal: { name: 'Turn Taking' },
          student: { firstName: 'Emma', lastName: 'Wilson' },
        },
        status: 'PENDING_VERIFICATION',
      });

      const result = await MasteryCheckService.initiate(
        { goalId: 'g1', studentId: 's1' },
        'teacher-1'
      );

      expect(result).toMatchObject({
        goalName: 'Turn Taking',
        studentName: 'Emma Wilson',
        status: 'PENDING_VERIFICATION',
      });
      expect(mockPrisma.masteryCheck.create).toHaveBeenCalled();
    });

    it('throws when assignment not found', async () => {
      mockPrisma.goalAssignment.findFirst.mockResolvedValue(null);

      await expect(
        MasteryCheckService.initiate({ goalId: 'g1', studentId: 's1' }, 'teacher-1')
      ).rejects.toThrow('Goal assignment not found');
    });

    it('throws when check already in progress', async () => {
      mockPrisma.goalAssignment.findFirst.mockResolvedValue({
        id: 'ga1',
        status: 'ACTIVE',
      });
      mockPrisma.trial.count.mockResolvedValue(10);
      mockPrisma.masteryCheck.findFirst.mockResolvedValue({
        id: 'mc-existing',
        status: 'PENDING_VERIFICATION',
      });

      await expect(
        MasteryCheckService.initiate({ goalId: 'g1', studentId: 's1' }, 'teacher-1')
      ).rejects.toThrow('A mastery check is already in progress for this goal');
    });
  });

  describe('verify', () => {
    it('assigns verifier B', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        verifierBId: null,
        verifierCId: null,
      });
      mockPrisma.masteryCheck.update.mockResolvedValue({});

      const result = await MasteryCheckService.verify(
        'mc1',
        { outcome: 'SUCCESS', notes: 'Confirmed independently' },
        'verifier-b'
      );

      expect(result).toEqual({ message: 'Verification submitted' });
      expect(mockPrisma.masteryCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verifierBId: 'verifier-b',
            verifierBData: { outcome: 'SUCCESS', notes: 'Confirmed independently' },
          }),
        })
      );
    });

    it('assigns verifier C and moves to PENDING_APPROVAL', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        verifierBId: 'vb-id',
        verifierCId: null,
      });
      mockPrisma.masteryCheck.update.mockResolvedValue({});

      const result = await MasteryCheckService.verify(
        'mc1',
        { outcome: 'SUCCESS' },
        'verifier-c'
      );

      expect(result).toEqual({ message: 'Verification submitted' });
      expect(mockPrisma.masteryCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verifierCId: 'verifier-c',
            status: 'PENDING_APPROVAL',
          }),
        })
      );
    });

    it('throws when all verifiers submitted', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        verifierBId: 'vb-id',
        verifierCId: 'vc-id',
      });

      await expect(
        MasteryCheckService.verify('mc1', { outcome: 'SUCCESS' }, 'another')
      ).rejects.toThrow('All verifiers have already submitted');
    });
  });

  describe('approve', () => {
    it('approves and marks goal as MASTERED', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        status: 'PENDING_APPROVAL',
        goalAssignmentId: 'ga1',
      });
      mockPrisma.masteryCheck.update.mockResolvedValue({});
      mockPrisma.goalAssignment.update.mockResolvedValue({});

      const result = await MasteryCheckService.approve(
        'mc1',
        { decision: 'APPROVE' },
        'approver-1'
      );

      expect(result).toEqual({ message: 'Goal mastered!' });
      expect(mockPrisma.masteryCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED' }),
        })
      );
      expect(mockPrisma.goalAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ga1' },
          data: expect.objectContaining({ status: 'MASTERED' }),
        })
      );
    });

    it('rejects the mastery check', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        status: 'PENDING_APPROVAL',
        goalAssignmentId: 'ga1',
      });
      mockPrisma.masteryCheck.update.mockResolvedValue({});

      const result = await MasteryCheckService.approve(
        'mc1',
        { decision: 'REJECT', reason: 'Insufficient data' },
        'approver-1'
      );

      expect(result).toEqual({ message: 'Mastery check rejected' });
      expect(mockPrisma.masteryCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            approvalNotes: 'Insufficient data',
          }),
        })
      );
      expect(mockPrisma.goalAssignment.update).not.toHaveBeenCalled();
    });

    it('throws when not ready for approval', async () => {
      mockPrisma.masteryCheck.findUnique.mockResolvedValue({
        id: 'mc1',
        status: 'PENDING_VERIFICATION',
        goalAssignmentId: 'ga1',
      });

      await expect(
        MasteryCheckService.approve('mc1', { decision: 'APPROVE' }, 'approver-1')
      ).rejects.toThrow('Mastery check is not ready for approval');
    });
  });
});
