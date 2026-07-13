import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { BarChart3, FileText, Users, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

type ReportTab = 'sessions' | 'progress' | 'overview';

interface SessionSummary {
  id: string;
  totalTrials: number;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  student: { firstName: string; lastName: string };
  teacher: { firstName: string; lastName: string };
  station: string;
}

interface StudentProgress {
  student: { id: string; firstName: string; lastName: string; status: string };
  goals: {
    total: number;
    active: number;
    mastered: number;
    overallProgress: number;
    byStation: Record<string, Array<{ id: string; progress: number; goal: { name: string } }>>;
  };
}

interface FoundationOverview {
  totalStudents: number;
  activeStudents: number;
  masteredThisMonth: number;
  recentIncidents: number;
  activeTeachers: number;
  programDistribution: Array<{ programType: string; _count: number }>;
  therapyGroupDistribution: Array<{ therapyGroup: string; _count: number }>;
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sessions');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  const tabs = [
    { id: 'sessions' as const, label: 'Session Reports', icon: FileText },
    { id: 'progress' as const, label: 'Student Progress', icon: TrendingUp },
    { id: 'overview' as const, label: 'Foundation Overview', icon: BarChart3 },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Reports & Oversight</h1>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Student</label>
          <input type="text" value={studentFilter} onChange={e => setStudentFilter(e.target.value)} placeholder="Search..." className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>

      {activeTab === 'sessions' && <SessionReports dateFrom={dateFrom} dateTo={dateTo} studentFilter={studentFilter} />}
      {activeTab === 'progress' && <StudentProgressView studentFilter={studentFilter} />}
      {activeTab === 'overview' && <FoundationOverviewView />}
    </div>
  );
}

function SessionReports({ dateFrom, dateTo, studentFilter }: { dateFrom: string; dateTo: string; studentFilter: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['session-reports', dateFrom, dateTo, studentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      if (studentFilter) params.set('studentId', studentFilter);
      const res = await api.get(`/reports/session-reports?${params.toString()}`);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Teacher</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Station</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trials</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data?.data?.map((s: SessionSummary) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {s.student.firstName} {s.student.lastName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {s.teacher.firstName} {s.teacher.lastName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {s.station === 'STATION_1' ? 'Station 1' : 'Station 2'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {new Date(s.startTime).toLocaleDateString()}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.totalTrials}</td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', s.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
          {(!data?.data || data.data.length === 0) && (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No session reports found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StudentProgressView({ studentFilter }: { studentFilter: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-progress', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/reports/student-progress/${studentFilter || 'all'}`);
      return res.data.data;
    },
    enabled: !!studentFilter,
  });

  if (!studentFilter) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Student</h3>
        <p className="mt-1 text-sm text-gray-500">Enter a student ID above to view their progress.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner className="h-32" />;

  const progress = data as StudentProgress;
  if (!progress) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {progress.student.firstName} {progress.student.lastName} — Goal Progress
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{progress.goals.total}</p>
            <p className="text-sm text-gray-500">Total Goals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-blue-600">{progress.goals.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-600">{progress.goals.mastered}</p>
            <p className="text-sm text-gray-500">Mastered</p>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Overall Progress</span>
          <span className="font-medium text-gray-900">{progress.goals.overallProgress}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div className="h-3 rounded-full bg-primary-500" style={{ width: `${progress.goals.overallProgress}%` }} />
        </div>
      </div>

      {Object.entries(progress.goals.byStation).map(([station, goals]) => (
        <div key={station} className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {station === 'STATION_1' ? 'Station 1 (Basic Skills)' : 'Station 2 (Advanced Skills)'}
          </h3>
          {goals.length === 0 ? (
            <p className="text-sm text-gray-500">No goals assigned.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g: { id: string; progress: number; goal: { name: string } }) => (
                <div key={g.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{g.goal.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 w-10 text-right">{Math.round(g.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FoundationOverviewView() {
  const { data, isLoading } = useQuery<FoundationOverview>({
    queryKey: ['foundation-overview'],
    queryFn: async () => {
      const res = await api.get('/reports/foundation-overview');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-gray-900">{data.totalStudents}</p>
          <p className="text-sm text-gray-500">Total Students</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-green-600">{data.activeStudents}</p>
          <p className="text-sm text-gray-500">Active Therapy</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-purple-600">{data.masteredThisMonth}</p>
          <p className="text-sm text-gray-500">Mastered This Month</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-amber-600">{data.recentIncidents}</p>
          <p className="text-sm text-gray-500">Incidents (30d)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Program Distribution</h3>
          {data.programDistribution.map(item => (
            <div key={item.programType} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{item.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(item._count / data.totalStudents) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{item._count}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Therapy Group Distribution</h3>
          {data.therapyGroupDistribution.map(item => (
            <div key={item.therapyGroup} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{item.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy' : 'Functional Living Skills'}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${(item._count / data.totalStudents) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{item._count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
