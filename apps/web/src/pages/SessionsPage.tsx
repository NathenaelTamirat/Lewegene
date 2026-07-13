import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface SessionBlock {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  assignments: Array<{
    id: string;
    teacher: { firstName: string; lastName: string };
    student: { firstName: string; lastName: string };
    station: string;
  }>;
}

export function SessionsPage() {
  const { data: activeBlock, isLoading } = useQuery<SessionBlock>({
    queryKey: ['active-block'],
    queryFn: async () => {
      const response = await api.get('/sessions/active-block');
      return response.data.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Today's Sessions</h1>

      {!activeBlock ? (
        <div className="mt-6 rounded-lg bg-white p-8 text-center shadow">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Session</h3>
          <p className="mt-1 text-sm text-gray-500">
            There is no active session block right now.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{activeBlock.name}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(activeBlock.startTime).toLocaleTimeString()} -{' '}
                  {new Date(activeBlock.endTime).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Assignments</h3>
            <div className="mt-4 space-y-4">
              {activeBlock.assignments.length === 0 ? (
                <div className="rounded-lg bg-white p-8 text-center shadow">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Assignments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No teacher-student assignments for this block.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeBlock.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {assignment.teacher.firstName} {assignment.teacher.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assignment.student.firstName} {assignment.student.lastName}
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-primary-100 px-2 text-xs font-semibold text-primary-800">
                          {assignment.station === 'STATION_1' ? 'Station 1' : 'Station 2'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
