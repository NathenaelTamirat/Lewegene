import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Search, Plus, Target } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';

interface Goal {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  usageCount: number;
  domain: { name: string };
}

export function GoalsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['goals', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '50');

      const response = await api.get(`/goals?${params.toString()}`);
      return response.data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Goal Bank</h1>
        <button className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      <div className="mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search goals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.data?.map((goal: Goal) => (
            <div
              key={goal.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                    <Target className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{goal.name}</h3>
                    <p className="text-xs text-gray-500">{goal.domain.name}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 text-xs font-semibold',
                    goal.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  )}
                >
                  {goal.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{goal.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>{goal.type === 'STANDARD' ? 'Standard' : 'Task Analysis'}</span>
                <span>{goal.usageCount} students</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
