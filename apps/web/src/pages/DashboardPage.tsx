import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, Target, Activity, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  masteredThisMonth: number;
  recentIncidents: number;
  activeTeachers: number;
  programDistribution: Array<{ programType: string; _count: number }>;
  therapyGroupDistribution: Array<{ therapyGroup: string; _count: number }>;
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/reports/foundation-overview');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  const statCards = [
    {
      name: 'Total Students',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Therapy',
      value: stats?.activeStudents ?? 0,
      icon: Activity,
      color: 'bg-green-500',
    },
    {
      name: 'Goals Mastered (This Month)',
      value: stats?.masteredThisMonth ?? 0,
      icon: Target,
      color: 'bg-purple-500',
    },
    {
      name: 'Recent Incidents (30d)',
      value: stats?.recentIncidents ?? 0,
      icon: AlertTriangle,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
            >
              <dt>
                <div className={`absolute rounded-md p-3 ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{card.name}</p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </dd>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Program Distribution</h3>
          </div>
          <div className="p-4">
            {stats?.programDistribution?.map((item) => (
              <div key={item.programType} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {item.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'}
                </span>
                <span className="font-medium">{item._count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Therapy Group Distribution</h3>
          </div>
          <div className="p-4">
            {stats?.therapyGroupDistribution?.map((item) => (
              <div key={item.therapyGroup} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {item.therapyGroup === 'BASIC_THERAPY'
                    ? 'Basic Therapy'
                    : 'Functional Living Skills'}
                </span>
                <span className="font-medium">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
