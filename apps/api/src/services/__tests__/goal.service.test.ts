import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import { GoalService } from '../goal.service';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

describe('GoalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated goals', async () => {
      const goals = [
        {
          id: 'g1',
          name: 'Turn Taking',
          domainId: 'd1',
          domain: { id: 'd1', name: 'Social Skills' },
          _count: { assignments: 3 },
        },
      ];

      mockPrisma.goal.findMany.mockResolvedValue(goals);
      mockPrisma.goal.count.mockResolvedValue(1);

      const result = await GoalService.findAll({
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].usageCount).toBe(3);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('findById', () => {
    it('returns goal with taskAnalysisSteps', async () => {
      const goal = {
        id: 'g1',
        name: 'Turn Taking',
        domain: { id: 'd1', name: 'Social Skills' },
        taskAnalysisSteps: [
          { id: 'step1', name: 'Wait for cue', sortOrder: 1 },
          { id: 'step2', name: 'Take turn', sortOrder: 2 },
        ],
        _count: { assignments: 2 },
      };

      mockPrisma.goal.findUnique.mockResolvedValue(goal);

      const result = await GoalService.findById('g1');

      expect(result.name).toBe('Turn Taking');
      expect(result.taskAnalysisSteps).toHaveLength(2);
      expect(result.usageCount).toBe(2);
    });

    it('throws when not found', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(GoalService.findById('nonexistent')).rejects.toThrow('Goal not found');
    });
  });

  describe('create', () => {
    it('creates a new goal', async () => {
      const goalData = {
        name: 'New Goal',
        domainId: 'd1',
        description: 'A new test goal',
        type: 'STANDARD' as const,
        suggestedAgeMin: 3,
        suggestedAgeMax: 10,
        masteryCriteria: { threshold: 80 },
      };

      mockPrisma.goal.create.mockResolvedValue({
        id: 'g-new',
        ...goalData,
        domain: { name: 'Social Skills' },
      });

      const result = await GoalService.create(goalData);

      expect(mockPrisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Goal' }),
        })
      );
      expect(result.id).toBe('g-new');
    });
  });

  describe('update', () => {
    it('updates an existing goal', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', name: 'Old Name' });
      mockPrisma.goal.update.mockResolvedValue({
        id: 'g1',
        name: 'Updated Name',
        domain: { name: 'Social Skills' },
      });

      const result = await GoalService.update('g1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('throws when not found', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(
        GoalService.update('nonexistent', { name: 'X' })
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('deactivate', () => {
    it('deactivates a goal', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        id: 'g1',
        _count: { assignments: 0 },
      });
      mockPrisma.goal.update.mockResolvedValue({});

      const result = await GoalService.deactivate('g1');

      expect(result).toEqual({ message: 'Goal deactivated successfully' });
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { isActive: false },
      });
    });
  });

  describe('delete', () => {
    it('deletes a goal with no active assignments', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        id: 'g1',
        _count: { assignments: 0 },
      });
      mockPrisma.goal.delete.mockResolvedValue({});

      const result = await GoalService.delete('g1');

      expect(result).toEqual({ message: 'Goal deleted successfully' });
      expect(mockPrisma.goal.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    });

    it('throws when goal has active assignments', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        id: 'g1',
        _count: { assignments: 3 },
      });

      await expect(GoalService.delete('g1')).rejects.toThrow(
        'Cannot delete goal with active student assignments'
      );
    });
  });

  describe('assignToStudent', () => {
    it('assigns a goal to student', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', firstName: 'Emma' });
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', name: 'Turn Taking' });
      mockPrisma.goalAssignment.count.mockResolvedValue(1);
      mockPrisma.goalAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.goalAssignment.create.mockResolvedValue({
        id: 'ga1',
        studentId: 's1',
        goalId: 'g1',
        station: 'STATION_1',
        goal: { name: 'Turn Taking', type: 'STANDARD' },
        student: { firstName: 'Emma', lastName: 'Wilson' },
      });

      const result = await GoalService.assignToStudent({
        studentId: 's1',
        goalId: 'g1',
        station: 'STATION_1',
      });

      expect(result.id).toBe('ga1');
      expect(mockPrisma.goalAssignment.create).toHaveBeenCalled();
    });

    it('throws when station is full (2 active goals)', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1' });
      mockPrisma.goalAssignment.count.mockResolvedValue(2);

      await expect(
        GoalService.assignToStudent({
          studentId: 's1',
          goalId: 'g1',
          station: 'STATION_1',
        })
      ).rejects.toThrow('Station already has 2 active goals');
    });
  });

  describe('getStudentCaseload', () => {
    it('returns goals grouped by station', async () => {
      const assignments = [
        {
          id: 'ga1',
          station: 'STATION_1',
          goal: { id: 'g1', name: 'Turn Taking', type: 'STANDARD', domain: { name: 'Social' } },
          _count: { trials: 10 },
        },
        {
          id: 'ga2',
          station: 'STATION_2',
          goal: { id: 'g2', name: 'Writing', type: 'TASK_ANALYSIS', domain: { name: 'Academic' } },
          _count: { trials: 5 },
        },
      ];

      mockPrisma.goalAssignment.findMany.mockResolvedValue(assignments);

      const result = await GoalService.getStudentCaseload('s1');

      expect(result.STATION_1).toHaveLength(1);
      expect(result.STATION_2).toHaveLength(1);
      expect(result.STATION_1[0].goal.name).toBe('Turn Taking');
    });
  });

  describe('getTaskSteps', () => {
    it('returns task analysis steps for a goal', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g1', name: 'Washing Hands' });
      mockPrisma.taskAnalysisStep.findMany.mockResolvedValue([
        { id: 'step1', name: 'Turn on water', sortOrder: 1 },
        { id: 'step2', name: 'Apply soap', sortOrder: 2 },
      ]);

      const result = await GoalService.getTaskSteps('g1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.taskAnalysisStep.findMany).toHaveBeenCalledWith({
        where: { goalId: 'g1' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('throws when goal not found', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      await expect(GoalService.getTaskSteps('nonexistent')).rejects.toThrow('Goal not found');
    });
  });
});
