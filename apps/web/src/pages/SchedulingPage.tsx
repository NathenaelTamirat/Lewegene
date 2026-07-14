import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { Calendar, Users, Plus, Trash2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface StaffSchedule {
  id: string;
  date: string;
  blockName: string;
  startTime: string;
  endTime: string;
  teacher: { id: string; firstName: string; lastName: string };
  student: { id: string; firstName: string; lastName: string };
  station: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface TeacherUnavailability {
  id: string;
  teacherId: string;
  date: string;
  blockName: string;
  reason: string;
}

const stations = ['STATION_1', 'STATION_2'];

const blocks = [
  { name: 'Morning - Station 1', time: '08:00 - 08:30' },
  { name: 'Morning - Station 2', time: '08:30 - 09:00' },
  { name: 'Morning - Station 1', time: '09:00 - 09:30' },
  { name: 'Morning - Station 2', time: '09:30 - 10:00' },
  { name: 'Afternoon - Station 1', time: '13:00 - 13:30' },
  { name: 'Afternoon - Station 2', time: '13:30 - 14:00' },
];

export function SchedulingPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const { data: schedules, isLoading } = useQuery<StaffSchedule[]>({
    queryKey: ['schedules', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/schedules?date=${selectedDate}`);
      return res.data.data || [];
    },
  });

  const { data: teachers } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data.data;
    },
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students-list-schedule'],
    queryFn: async () => {
      const res = await api.get('/students?limit=100&status=ACTIVE_THERAPY');
      return res.data.data;
    },
  });

  const { data: unavailabilities } = useQuery<TeacherUnavailability[]>({
    queryKey: ['teacher-unavailability', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/schedules/unavailability?date=${selectedDate}`);
      return res.data.data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { teacherId: string; studentId: string; station: string; blockName: string; date: string }) => {
      const res = await api.post('/schedules/assign', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowAssignModal(false);
      setConflictError(null);
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const msg = error.response?.data?.error || 'Assignment failed';
      setConflictError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  const unavailMutation = useMutation({
    mutationFn: async (data: { teacherId: string; date: string; blockName: string; reason: string }) => {
      return api.post('/schedules/unavailability', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-unavailability'] });
      setShowUnavailModal(false);
    },
  });

  const groupedSchedule: Record<string, StaffSchedule[]> = {};
  schedules?.forEach(s => {
    const key = `${s.blockName} ${s.startTime}`;
    if (!groupedSchedule[key]) groupedSchedule[key] = [];
    groupedSchedule[key].push(s);
  });

  const assignedStudentIds = new Set(schedules?.map(s => s.student.id) || []);
  const unassignedStudents = students?.filter(s => !assignedStudentIds.has(s.id)) || [];

  const unavailableTeacherIds = new Set(
    unavailabilities?.map(u => u.teacherId) || []
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Staff Scheduling</h1>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={() => setShowUnavailModal(true)}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <XCircle className="h-4 w-4" /> Mark Unavailable
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" /> Assign
          </button>
        </div>
      </div>

      {unassignedStudents.length > 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-medium text-amber-800">Unassigned Students ({unassignedStudents.length})</h3>
          </div>
          <p className="text-sm text-amber-700 mb-2">These students do not have a teacher assignment for today:</p>
          <div className="flex flex-wrap gap-2">
            {unassignedStudents.map(s => (
              <span key={s.id} className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {s.firstName} {s.lastName}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="space-y-4">
          {blocks.map((block, idx) => (
            <div key={idx} className="rounded-lg bg-white shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">{block.name}</h3>
                  <span className="text-xs text-gray-500">{block.time}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedSchedule[`${block.name} ${block.time}`]?.map(s => {
                    const isUnavailable = unavailableTeacherIds.has(s.teacher.id);
                    return (
                      <div key={s.id} className={cn(
                        'flex items-center justify-between rounded-md border p-3',
                        isUnavailable ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                            isUnavailable ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'
                          )}>
                            {s.teacher.firstName[0]}{s.teacher.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {s.teacher.firstName} {s.teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {s.student.firstName} {s.student.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-primary-100 px-2 text-xs font-semibold text-primary-800">
                            {s.station === 'STATION_1' ? 'S1' : 'S2'}
                          </span>
                          <button
                            onClick={() => { if (window.confirm('Remove this assignment?')) deleteMutation.mutate(s.id); }}
                            className="rounded p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }) || (
                    <p className="text-sm text-gray-400 italic col-span-3">No assignments for this block.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <AssignModal
          teachers={teachers || []}
          students={students || []}
          blocks={blocks}
          conflictError={conflictError}
          onAssign={(data) => assignMutation.mutate({ ...data, date: selectedDate })}
          onClose={() => { setShowAssignModal(false); setConflictError(null); }}
          isPending={assignMutation.isPending}
        />
      )}

      {showUnavailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Mark Teacher Unavailable</h2>
            <UnavailabilityForm
              teachers={teachers || []}
              blocks={blocks}
              onSubmit={(data) => unavailMutation.mutate({ ...data, date: selectedDate })}
              onCancel={() => setShowUnavailModal(false)}
              isPending={unavailMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssignModal({
  teachers,
  students,
  blocks,
  conflictError,
  onAssign,
  onClose,
  isPending,
}: {
  teachers: User[];
  students: Student[];
  blocks: Array<{ name: string; time: string }>;
  conflictError: string | null;
  onAssign: (data: { teacherId: string; studentId: string; station: string; blockName: string }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [teacherId, setTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [station, setStation] = useState('STATION_1');
  const [blockName, setBlockName] = useState(blocks[0]?.name || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Assign Teacher-Student</h2>
        {conflictError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {conflictError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Teacher</label>
            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select teacher...</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Student</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">Select student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Station</label>
            <div className="flex gap-3 mt-1">
              {stations.map(s => (
                <button
                  key={s}
                  onClick={() => setStation(s)}
                  className={cn(
                    'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium',
                    station === s ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {s === 'STATION_1' ? 'Station 1' : 'Station 2'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Block</label>
            <select value={blockName} onChange={e => setBlockName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              {blocks.map((b, i) => (
                <option key={i} value={b.name}>{b.name} ({b.time})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onAssign({ teacherId, studentId, station, blockName })}
            disabled={!teacherId || !studentId || isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnavailabilityForm({
  teachers,
  blocks,
  onSubmit,
  onCancel,
  isPending,
}: {
  teachers: User[];
  blocks: Array<{ name: string; time: string }>;
  onSubmit: (data: { teacherId: string; blockName: string; reason: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [teacherId, setTeacherId] = useState('');
  const [blockName, setBlockName] = useState(blocks[0]?.name || '');
  const [reason, setReason] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Teacher</label>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option value="">Select teacher...</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Block</label>
        <select value={blockName} onChange={e => setBlockName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          {blocks.map((b, i) => (
            <option key={i} value={b.name}>{b.name} ({b.time})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
        <input value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="e.g., Personal leave" />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={() => onSubmit({ teacherId, blockName, reason })}
          disabled={!teacherId || isPending}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Mark Unavailable'}
        </button>
      </div>
    </div>
  );
}
