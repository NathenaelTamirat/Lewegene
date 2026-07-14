import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../../__tests__/setup';
import { ReportService } from '../report.service';

vi.mock('@melue/db', () => ({ default: mockPrisma }));

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessionSummaries', () => {
    it('returns paginated submitted summaries', async () => {
      const summaries = [
        {
          id: 'ss1',
          sessionId: 'sb1',
          status: 'SUBMITTED',
          student: { firstName: 'Emma', lastName: 'Wilson' },
          teacher: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      mockPrisma.sessionSummary.findMany.mockResolvedValue(summaries);
      mockPrisma.sessionSummary.count.mockResolvedValue(1);

      const result = await ReportService.getSessionSummaries({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrisma.sessionSummary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SUBMITTED' }),
        })
      );
    });
  });

  describe('getStudentProgress', () => {
    it('returns student goals and incidents', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        firstName: 'Emma',
        lastName: 'Wilson',
        status: 'ACTIVE_THERAPY',
        goalAssignments: [
          { id: 'ga1', status: 'IN_PROGRESS', station: 'STATION_1', goal: { name: 'Turn Taking', type: 'STANDARD' } },
          { id: 'ga2', status: 'MASTERED', station: 'STATION_2', goal: { name: 'Writing', type: 'TASK_ANALYSIS' } },
        ],
        assessments: [{ id: 'a1', type: 'ABLLS' }],
        behaviorIncidents: [{ id: 'bi1', category: 'AGGRESSION' }],
      });

      const result = await ReportService.getStudentProgress('s1');

      expect(result.student.firstName).toBe('Emma');
      expect(result.goals.total).toBe(2);
      expect(result.goals.mastered).toBe(1);
      expect(result.goals.active).toBe(1);
      expect(result.goals.overallProgress).toBe(50);
      expect(result.recentIncidents).toHaveLength(1);
    });

    it('throws when student not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(ReportService.getStudentProgress('nonexistent')).rejects.toThrow(
        'Student not found'
      );
    });
  });

  describe('getFoundationOverview', () => {
    it('returns counts and distributions', async () => {
      mockPrisma.student.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(35);
      mockPrisma.goalAssignment.count.mockResolvedValue(8);
      mockPrisma.behaviorIncident.count.mockResolvedValue(12);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.student.groupBy
        .mockResolvedValueOnce([
          { programType: 'FULL_DAY', _count: 20 },
          { programType: 'HALF_DAY', _count: 15 },
        ])
        .mockResolvedValueOnce([
          { therapyGroup: 'GROUP_A', _count: 10 },
          { therapyGroup: 'GROUP_B', _count: 25 },
        ]);

      const result = await ReportService.getFoundationOverview();

      expect(result.totalStudents).toBe(50);
      expect(result.activeStudents).toBe(35);
      expect(result.masteredThisMonth).toBe(8);
      expect(result.recentIncidents).toBe(12);
      expect(result.activeTeachers).toBe(10);
      expect(result.programDistribution).toHaveLength(2);
      expect(result.therapyGroupDistribution).toHaveLength(2);
    });
  });

  describe('getIncidentTrends', () => {
    it('returns incidents grouped by date', async () => {
      mockPrisma.behaviorIncident.findMany.mockResolvedValue([
        { timestamp: new Date('2026-07-10T10:00:00Z'), category: 'AGGRESSION' },
        { timestamp: new Date('2026-07-10T14:00:00Z'), category: 'ELOPEMENT' },
        { timestamp: new Date('2026-07-12T09:00:00Z'), category: 'AGGRESSION' },
      ]);

      const result = await ReportService.getIncidentTrends();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        date: '2026-07-10',
        count: 1,
        category: 'AGGRESSION',
      });
    });

    it('filters by studentId and date range', async () => {
      mockPrisma.behaviorIncident.findMany.mockResolvedValue([]);

      await ReportService.getIncidentTrends(
        's1',
        '2026-07-01',
        '2026-07-31'
      );

      expect(mockPrisma.behaviorIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 's1',
            timestamp: {
              gte: new Date('2026-07-01'),
              lte: new Date('2026-07-31'),
            },
          }),
        })
      );
    });
  });

  describe('generateBiAnnual', () => {
    it('returns 6-month summary', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 's1',
        firstName: 'Emma',
        lastName: 'Wilson',
      });
      mockPrisma.sessionSummary.count.mockResolvedValue(45);
      mockPrisma.goalAssignment.findMany.mockResolvedValue([
        { id: 'ga1', status: 'MASTERED', goal: { name: 'Turn Taking' } },
        { id: 'ga2', status: 'IN_PROGRESS', goal: { name: 'Writing' } },
      ]);
      mockPrisma.behaviorIncident.count.mockResolvedValue(5);

      const result = await ReportService.generateBiAnnual('s1');

      expect(result.student).toEqual({ firstName: 'Emma', lastName: 'Wilson' });
      expect(result.summary.sessionsCompleted).toBe(45);
      expect(result.summary.goalsAssigned).toBe(2);
      expect(result.summary.goalsMastered).toBe(1);
      expect(result.summary.behaviorIncidents).toBe(5);
      expect(result.goals).toHaveLength(2);
    });
  });
});
