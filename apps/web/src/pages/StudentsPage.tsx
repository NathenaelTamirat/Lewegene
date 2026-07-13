import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Search, Plus, Filter } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  programType: string;
  therapyGroup: string;
  status: string;
  headshotUrl: string | null;
}

const statusColors: Record<string, string> = {
  IN_ASSESSMENT: 'bg-yellow-100 text-yellow-800',
  ASSESSMENT_COMPLETE: 'bg-blue-100 text-blue-800',
  READY_FOR_IUP: 'bg-purple-100 text-purple-800',
  ACTIVE_THERAPY: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  IN_ASSESSMENT: 'In Assessment',
  ASSESSMENT_COMPLETE: 'Assessment Complete',
  READY_FOR_IUP: 'Ready for IUP',
  ACTIVE_THERAPY: 'Active Therapy',
  INACTIVE: 'Inactive',
};

export function StudentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');

      const response = await api.get(`/students?${params.toString()}`);
      return response.data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Students</h1>
        <button className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="IN_ASSESSMENT">In Assessment</option>
            <option value="ASSESSMENT_COMPLETE">Assessment Complete</option>
            <option value="READY_FOR_IUP">Ready for IUP</option>
            <option value="ACTIVE_THERAPY">Active Therapy</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="mt-6 overflow-hidden bg-white shadow sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Therapy Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data?.data?.map((student: Student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {student.age}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {student.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {student.therapyGroup === 'BASIC_THERAPY'
                      ? 'Basic Therapy'
                      : 'Functional Living Skills'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 text-xs font-semibold leading-5',
                        statusColors[student.status]
                      )}
                    >
                      {statusLabels[student.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
