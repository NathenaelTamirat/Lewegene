import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { BarChart3, Download, Filter, TrendingUp, Target, Activity } from 'lucide-react';

type ChartType = 'progress' | 'trials' | 'incidents' | 'assessment';

interface GoalProgress {
  name: string;
  domain: string;
  progress: number;
  trials: number;
  successes: number;
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  goals: GoalProgress[];
  sessionCount: number;
  avgIndependence: number;
}

interface IncidentTrend {
  date: string;
  count: number;
  category: string;
}

export function ChartsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [chartType, setChartType] = useState<ChartType>('progress');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: students } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ['students-list'],
    queryFn: async () => {
      const res = await api.get('/students?limit=100');
      return res.data.data;
    },
  });

  const { data: progress, isLoading } = useQuery<StudentProgress>({
    queryKey: ['student-progress', selectedStudentId],
    queryFn: async () => {
      const res = await api.get(`/reports/student-progress/${selectedStudentId}`);
      return res.data.data;
    },
    enabled: !!selectedStudentId,
  });

  const { data: incidents } = useQuery<IncidentTrend[]>({
    queryKey: ['incident-trends', selectedStudentId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ studentId: selectedStudentId });
      if (dateRange.start) params.append('start', dateRange.start);
      if (dateRange.end) params.append('end', dateRange.end);
      const res = await api.get(`/reports/incident-trends?${params}`);
      return res.data.data || [];
    },
    enabled: !!selectedStudentId && chartType === 'incidents',
  });

  const chartTypes = [
    { id: 'progress' as const, label: 'Goal Progress', icon: TrendingUp },
    { id: 'trials' as const, label: 'Trial Distribution', icon: BarChart3 },
    { id: 'incidents' as const, label: 'Incident Trends', icon: Activity },
    { id: 'assessment' as const, label: 'Assessment Summary', icon: Target },
  ];

  const handleExportPNG = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText(`Melue - ${chartTypes.find(c => c.id === chartType)?.label || 'Chart'}`, 20, 30);

    if (progress) {
      ctx.font = '12px system-ui';
      let y = 60;
      progress.goals.forEach(goal => {
        ctx.fillStyle = '#374151';
        ctx.fillText(`${goal.name}: ${goal.progress}%`, 20, y);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(200, y - 10, 200, 14);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(200, y - 10, (goal.progress / 100) * 200, 14);
        y += 30;
      });
    }

    const link = document.createElement('a');
    link.download = `melue-${chartType}-chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Charts & Reports</h1>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select Student</option>
            {students?.map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
          <button
            onClick={handleExportPNG}
            disabled={!selectedStudentId}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export PNG
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {chartTypes.map(ct => (
            <button
              key={ct.id}
              onClick={() => setChartType(ct.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                chartType === ct.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <ct.icon className="h-4 w-4" />
              {ct.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Student</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a student to view their charts and graphs.</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="rounded-lg bg-white shadow p-6">
          {chartType === 'progress' && progress && (
            <GoalProgressChart goals={progress.goals} />
          )}
          {chartType === 'trials' && progress && (
            <TrialDistributionChart goals={progress.goals} />
          )}
          {chartType === 'incidents' && (
            <IncidentTrendChart incidents={incidents || []} />
          )}
          {chartType === 'assessment' && progress && (
            <AssessmentSummaryChart goals={progress.goals} />
          )}
        </div>
      )}
    </div>
  );
}

function GoalProgressChart({ goals }: { goals: GoalProgress[] }) {
  const maxProgress = Math.max(...goals.map(g => g.progress), 100);

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Progress</h3>
      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{goal.name}</span>
              <span className="text-gray-500">{goal.progress}%</span>
            </div>
            <div className="h-6 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-6 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{goal.domain}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrialDistributionChart({ goals }: { goals: GoalProgress[] }) {
  const maxTrials = Math.max(...goals.map(g => g.trials), 1);

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Trial Distribution</h3>
      <div className="flex items-end gap-4 h-64 border-b border-l border-gray-300 pl-2 pb-2">
        {goals.map((goal, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs text-gray-500">{goal.trials}</div>
            <div className="w-full flex gap-0.5 items-end" style={{ height: '200px' }}>
              <div
                className="flex-1 bg-green-400 rounded-t"
                style={{ height: `${(goal.successes / maxTrials) * 200}px` }}
                title={`Successes: ${goal.successes}`}
              />
              <div
                className="flex-1 bg-red-400 rounded-t"
                style={{ height: `${((goal.trials - goal.successes) / maxTrials) * 200}px` }}
                title={`Failures: ${goal.trials - goal.successes}`}
              />
            </div>
            <div className="text-xs text-gray-600 text-center truncate w-full" title={goal.name}>
              {goal.name.length > 10 ? goal.name.slice(0, 10) + '...' : goal.name}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span className="text-gray-600">Successes</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span className="text-gray-600">Failures</span>
        </div>
      </div>
    </div>
  );
}

function IncidentTrendChart({ incidents }: { incidents: IncidentTrend[] }) {
  const groupedByDate: Record<string, number> = {};
  incidents.forEach(i => {
    groupedByDate[i.date] = (groupedByDate[i.date] || 0) + i.count;
  });
  const dates = Object.keys(groupedByDate).sort();
  const maxCount = Math.max(...Object.values(groupedByDate), 1);

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Incident Trends</h3>
      {dates.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No incident data available for the selected period.</p>
      ) : (
        <div className="flex items-end gap-2 h-64 border-b border-l border-gray-300 pl-2 pb-2">
          {dates.map(date => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs text-gray-500">{groupedByDate[date]}</div>
              <div
                className="w-full bg-amber-400 rounded-t"
                style={{ height: `${(groupedByDate[date] / maxCount) * 200}px` }}
              />
              <div className="text-xs text-gray-600 text-center">
                {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentSummaryChart({ goals }: { goals: GoalProgress[] }) {
  const domains = [...new Set(goals.map(g => g.domain))];
  const domainData = domains.map(d => {
    const domainGoals = goals.filter(g => g.domain === d);
    const avgProgress = domainGoals.reduce((sum, g) => sum + g.progress, 0) / domainGoals.length;
    return { domain: d, avgProgress, count: domainGoals.length };
  });

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Summary by Domain</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domainData.map((d, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{d.domain}</h4>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="text-2xl font-bold text-primary-600">{Math.round(d.avgProgress)}%</div>
                <p className="text-xs text-gray-500">Average Progress</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-700">{d.count}</div>
                <p className="text-xs text-gray-500">Goals</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-primary-500" style={{ width: `${d.avgProgress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
