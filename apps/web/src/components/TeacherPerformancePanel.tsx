import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '../lib/utils';
import { Users } from 'lucide-react';

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  avatar: string | null;
  sessionsCompleted: number;
  avgTrialsPerSession: number;
  avgIndependence: number;
  incidentRate: number;
  reviewPercentage: number;
  performanceTier: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
}

interface TeacherPerformancePanelProps {
  teacherId?: string;
}

const tierStyles: Record<string, { card: string; badge: string; label: string }> = {
  EXCELLENT: {
    card: 'border-green-200 bg-green-50/30',
    badge: 'bg-green-100 text-green-800',
    label: 'Excellent',
  },
  GOOD: {
    card: 'border-blue-200 bg-blue-50/30',
    badge: 'bg-blue-100 text-blue-800',
    label: 'Good',
  },
  NEEDS_IMPROVEMENT: {
    card: 'border-amber-200 bg-amber-50/30',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Needs Improvement',
  },
};

function independenceColor(pct: number): string {
  if (pct > 80) return 'text-green-600';
  if (pct >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function independenceBg(pct: number): string {
  if (pct > 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarBg(name: string): string {
  const colors = [
    'bg-primary-100 text-primary-700',
    'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function TeacherPerformancePanel({ teacherId }: TeacherPerformancePanelProps) {
  const { data: teachers, isLoading } = useQuery<TeacherPerformance[]>({
    queryKey: ['teacher-performance', teacherId],
    queryFn: async () => {
      const params = teacherId ? `?teacherId=${teacherId}` : '';
      const res = await api.get(`/reports/teacher-performance${params}`);
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;

  if (!teachers || teachers.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Teacher Data</h3>
        <p className="mt-1 text-sm text-gray-500">No session data available for teachers yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900">Teacher Performance Metrics</h3>
        <span className="text-xs text-gray-500 ml-auto">{teachers.length} teachers</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teachers.map(teacher => {
          const tier = tierStyles[teacher.performanceTier] || tierStyles.GOOD;
          return (
            <div
              key={teacher.teacherId}
              className={cn(
                'rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
                tier.card
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                    getAvatarBg(teacher.teacherName)
                  )}
                >
                  {getInitials(teacher.teacherName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{teacher.teacherName}</p>
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', tier.badge)}>
                    {tier.label}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                {/* Sessions Completed */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Sessions Completed</span>
                  <span className="text-sm font-semibold text-gray-900">{teacher.sessionsCompleted}</span>
                </div>

                {/* Avg Trials */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Avg Trials / Session</span>
                  <span className="text-sm font-semibold text-gray-900">{teacher.avgTrialsPerSession}</span>
                </div>

                {/* Independence % */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Student Independence</span>
                    <span className={cn('text-sm font-semibold', independenceColor(teacher.avgIndependence))}>
                      {teacher.avgIndependence}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className={cn('h-1.5 rounded-full transition-all duration-500', independenceBg(teacher.avgIndependence))}
                      style={{ width: `${Math.min(teacher.avgIndependence, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Incident Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Incident Rate</span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      teacher.incidentRate < 0.5
                        ? 'text-green-600'
                        : teacher.incidentRate < 1
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    )}
                  >
                    {teacher.incidentRate} / session
                  </span>
                </div>

                {/* Review Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Review Status</span>
                  <span className={cn('text-sm font-semibold', teacher.reviewPercentage >= 80 ? 'text-green-600' : 'text-amber-600')}>
                    {teacher.reviewPercentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
