import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { Calendar, Users, AlertTriangle, RefreshCw, ArrowRightLeft } from 'lucide-react';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface TimeBlock {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  station: string;
}

interface Assignment {
  id: string;
  teacherId: string;
  student: { id: string; firstName: string; lastName: string };
  blockId: string;
  station: string;
}

interface TeacherAvailability {
  teacherId: string;
  blockId: string;
  available: boolean;
}

interface ScheduleData {
  teachers: Teacher[];
  blocks: TimeBlock[];
  assignments: Assignment[];
  availability: TeacherAvailability[];
}

const timeBlocks = [
  { id: 'block-1', label: 'Block 1 (8:00–9:00)', startTime: '08:00', endTime: '09:00' },
  { id: 'block-2', label: 'Block 2 (9:00–10:00)', startTime: '09:00', endTime: '10:00' },
  { id: 'block-3', label: 'Block 3 (10:00–11:00)', startTime: '10:00', endTime: '11:00' },
  { id: 'block-4', label: 'Block 4 (11:00–12:00)', startTime: '11:00', endTime: '12:00' },
  { id: 'block-5', label: 'Block 5 (1:00–2:00)', startTime: '13:00', endTime: '14:00' },
  { id: 'block-6', label: 'Block 6 (2:00–3:00)', startTime: '14:00', endTime: '15:00' },
];

export function OperationalManagementPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reassignModal, setReassignModal] = useState<{ teacherId: string; blockId: string; studentId: string } | null>(null);
  const [newTeacherId, setNewTeacherId] = useState('');

  const { data: schedule, isLoading } = useQuery<ScheduleData>({
    queryKey: ['schedule-ops', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/scheduling/operations?date=${selectedDate}`);
      return res.data.data;
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ teacherId, blockId, available }: { teacherId: string; blockId: string; available: boolean }) => {
      return api.post('/scheduling/availability', { teacherId, blockId, date: selectedDate, available });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-ops'] }),
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ assignmentId, newTeacherId }: { assignmentId: string; newTeacherId: string }) => {
      return api.post(`/scheduling/reassign`, { assignmentId, newTeacherId, date: selectedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-ops'] });
      setReassignModal(null);
      setNewTeacherId('');
    },
  });

  const getAvailability = (teacherId: string, blockId: string): boolean => {
    if (!schedule) return true;
    const entry = schedule.availability.find(a => a.teacherId === teacherId && a.blockId === blockId);
    return entry ? entry.available : true;
  };

  const getAssignments = (teacherId: string, blockId: string): Assignment[] => {
    if (!schedule) return [];
    return schedule.assignments.filter(a => a.teacherId === teacherId && a.blockId === blockId);
  };

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Operational Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['schedule-ops'] })}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-48">Teacher</th>
                {timeBlocks.map(block => (
                  <th key={block.id} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 min-w-[160px]">
                    <div>{block.label.split('(')[0].trim()}</div>
                    <div className="font-normal normal-case text-gray-400">{block.startTime}–{block.endTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {schedule?.teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">
                        {teacher.firstName[0]}{teacher.lastName[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{teacher.firstName} {teacher.lastName}</span>
                    </div>
                  </td>
                  {timeBlocks.map(block => {
                    const available = getAvailability(teacher.id, block.id);
                    const assignments = getAssignments(teacher.id, block.id);
                    return (
                      <td key={block.id} className="px-3 py-3">
                        <div className={cn(
                          'rounded-md p-2 text-center text-xs min-h-[60px] flex flex-col items-center justify-center gap-1',
                          available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        )}>
                          {!available ? (
                            <div className="flex flex-col items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-400" />
                              <span className="text-red-600 font-medium">Unavailable</span>
                              <button
                                onClick={() => toggleAvailabilityMutation.mutate({ teacherId: teacher.id, blockId: block.id, available: true })}
                                className="text-[10px] text-primary-600 hover:underline"
                              >
                                Mark Available
                              </button>
                            </div>
                          ) : assignments.length > 0 ? (
                            <div className="space-y-1 w-full">
                              {assignments.map(a => (
                                <div key={a.id} className="flex items-center justify-between gap-1 rounded bg-white px-1.5 py-0.5 border border-gray-100">
                                  <span className="text-gray-700 truncate">{a.student.firstName} {a.student.lastName}</span>
                                  <button
                                    onClick={() => setReassignModal({ teacherId: teacher.id, blockId: block.id, studentId: a.student.id })}
                                    className="shrink-0 text-gray-400 hover:text-primary-600"
                                    title="Reassign"
                                  >
                                    <ArrowRightLeft className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleAvailabilityMutation.mutate({ teacherId: teacher.id, blockId: block.id, available: false })}
                              className="text-[10px] text-gray-400 hover:text-red-500"
                            >
                              Mark Unavailable
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {(!schedule?.teachers || schedule.teachers.length === 0) && (
                <tr>
                  <td colSpan={timeBlocks.length + 1} className="px-6 py-8 text-center text-sm text-gray-500">
                    No teachers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100 border border-green-200" /> Available</div>
        <div className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100 border border-red-200" /> Unavailable</div>
        <div className="flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Reassign student</div>
      </div>

      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Reassign Student</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Teacher</label>
              <select
                value={newTeacherId}
                onChange={e => setNewTeacherId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select teacher...</option>
                {schedule?.teachers
                  .filter(t => t.id !== reassignModal.teacherId && getAvailability(t.id, reassignModal.blockId))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setReassignModal(null); setNewTeacherId(''); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newTeacherId || !reassignModal) return;
                  reassignMutation.mutate({ assignmentId: reassignModal.studentId, newTeacherId });
                }}
                disabled={!newTeacherId || reassignMutation.isPending}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
