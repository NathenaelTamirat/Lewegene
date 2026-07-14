import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { FileText, Plus, CheckCircle, Archive, Eye, Edit2 } from 'lucide-react';

interface IUP {
  id: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  finalizedAt: string | null;
  archivedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
  goalAssignments: Array<{
    id: string;
    station: string;
    goal: { name: string; type: string };
  }>;
  _count: { goalAssignments: number };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-amber-100 text-amber-800',
};

const IUP_SECTIONS = [
  'Student Info', 'Assessment Summary', 'Reinforcement Strategies',
  'Consequence Strategies', 'Family Participation Plan', 'Behavior Reduction Protocol',
  'Replacement Behavior Goals', 'Antecedent Manipulations', 'Crisis Plan',
  'Coordination of Care', 'Discharge Criteria', 'Signatures',
];

export function IupsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('');
  const [selectedIup, setSelectedIup] = useState<IUP | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students-list'],
    queryFn: async () => {
      const res = await api.get('/students?limit=100');
      return res.data.data;
    },
  });

  const { data: iups, isLoading } = useQuery<IUP[]>({
    queryKey: ['iups'],
    queryFn: async () => {
      const res = await api.get('/iups');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (studentId: string) => api.post('/iups', { studentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iups'] });
      setShowNewForm(false);
      setNewStudentId('');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/iups/${id}/finalize`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iups'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/iups/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iups'] }),
  });

  const filtered = iups?.filter(i => !filter || i.status === filter) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">IUP Management</h1>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> New IUP
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'DRAFT', 'ACTIVE', 'ARCHIVED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium',
              filter === f ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New IUP</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
              <select
                value={newStudentId}
                onChange={e => setNewStudentId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Choose...</option>
                {students?.filter(s => s.status === 'ASSESSMENT_COMPLETE' || s.status === 'READY_FOR_IUP').map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createMutation.mutate(newStudentId)}
                disabled={!newStudentId || createMutation.isPending}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No IUPs Found</h3>
          <p className="mt-1 text-sm text-gray-500">Create an IUP for a student with completed assessments.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(iup => (
            <div key={iup.id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                    {iup.student.firstName[0]}{iup.student.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{iup.student.firstName} {iup.student.lastName}</p>
                    <p className="text-xs text-gray-500">
                      {iup._count.goalAssignments} goals assigned | Created {new Date(iup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', statusColors[iup.status])}>
                    {iup.status}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedIup(iup)} className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <Eye className="h-4 w-4" />
                    </button>
                    {iup.status === 'DRAFT' && (
                      <button
                        onClick={() => finalizeMutation.mutate(iup.id)}
                        className="rounded p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50"
                        title="Finalize"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {iup.status === 'ACTIVE' && (
                      <button
                        onClick={() => { if (window.confirm('Archive this IUP?')) archiveMutation.mutate(iup.id); }}
                        className="rounded p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {iup.goalAssignments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {iup.goalAssignments.map(ga => (
                    <span key={ga.id} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {ga.goal.name} ({ga.station === 'STATION_1' ? 'S1' : 'S2'})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedIup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                IUP — {selectedIup.student.firstName} {selectedIup.student.lastName}
              </h2>
              <button onClick={() => setSelectedIup(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="space-y-3">
              {IUP_SECTIONS.map((section, idx) => (
                <div key={idx} className="rounded-md border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{idx + 1}. {section}</span>
                    {(idx === 0 || idx === 1 || idx === 11) && (
                      <span className="text-xs text-gray-400 italic">Auto-populated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              {selectedIup.status === 'DRAFT' && (
                <button
                  onClick={() => { finalizeMutation.mutate(selectedIup.id); setSelectedIup(null); }}
                  className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Finalize IUP
                </button>
              )}
              <button onClick={() => setSelectedIup(null)} className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
