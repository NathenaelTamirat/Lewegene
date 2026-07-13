import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { ArrowLeft, Edit2, Save, X, Target, FileText, Calendar } from 'lucide-react';

interface StudentDetail {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  age: number;
  diagnosis: string | null;
  programType: string;
  therapyGroup: string;
  status: string;
  station: string | null;
  headshotUrl: string | null;
  enrolledAt: string;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  goalAssignments: Array<{
    id: string;
    station: string;
    status: string;
    progress: number;
    notes: string | null;
    goal: { id: string; name: string; type: string; domain: { name: string } };
  }>;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    uploadedAt: string;
  }>;
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

const goalStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  MASTERED: 'bg-purple-100 text-purple-800',
  REMOVED: 'bg-gray-100 text-gray-800',
};

export function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const { data: student, isLoading } = useQuery<StudentDetail>({
    queryKey: ['student', id],
    queryFn: async () => {
      const response = await api.get(`/students/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const response = await api.patch(`/students/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsEditing(false);
      setEditData({});
    },
  });

  const handleEdit = () => {
    if (!student) return;
    setEditData({
      firstName: student.firstName,
      middleName: student.middleName || '',
      lastName: student.lastName,
      diagnosis: student.diagnosis || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  if (isLoading) {
    return <LoadingSpinner className="h-64" />;
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Student not found.</p>
        <button onClick={() => navigate('/students')} className="mt-2 text-primary-600 hover:underline">
          Back to Students
        </button>
      </div>
    );
  }

  const activeGoals = student.goalAssignments.filter(g => g.status === 'ACTIVE' || g.status === 'IN_PROGRESS');
  const station1Goals = activeGoals.filter(g => g.station === 'STATION_1');
  const station2Goals = activeGoals.filter(g => g.station === 'STATION_2');

  return (
    <div>
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xl font-bold">
            {student.headshotUrl ? (
              <img src={student.headshotUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span>{student.firstName[0]}{student.lastName[0]}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {student.firstName} {student.middleName} {student.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              Age {student.age} | {student.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'} |{' '}
              {student.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy' : 'Functional Living Skills'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-sm font-semibold',
              statusColors[student.status]
            )}
          >
            {statusLabels[student.status]}
          </span>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">First Name</label>
                {isEditing ? (
                  <input
                    value={editData.firstName}
                    onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Middle Name</label>
                {isEditing ? (
                  <input
                    value={editData.middleName}
                    onChange={e => setEditData({ ...editData, middleName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.middleName || '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Name</label>
                {isEditing ? (
                  <input
                    value={editData.lastName}
                    onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.lastName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(student.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Diagnosis</label>
                {isEditing ? (
                  <input
                    value={editData.diagnosis}
                    onChange={e => setEditData({ ...editData, diagnosis: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.diagnosis || '—'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Guardian Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Guardian Name</label>
                {isEditing ? (
                  <input
                    value={editData.guardianName}
                    onChange={e => setEditData({ ...editData, guardianName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.guardianName || '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Phone</label>
                {isEditing ? (
                  <input
                    value={editData.guardianPhone}
                    onChange={e => setEditData({ ...editData, guardianPhone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.guardianPhone || '—'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-500">Email</label>
                {isEditing ? (
                  <input
                    value={editData.guardianEmail}
                    onChange={e => setEditData({ ...editData, guardianEmail: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{student.guardianEmail || '—'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Goals — Station 1 (Basic Skills)
              </span>
            </h2>
            {station1Goals.length === 0 ? (
              <p className="text-sm text-gray-500">No active goals at Station 1.</p>
            ) : (
              <div className="space-y-3">
                {station1Goals.map(g => (
                  <div key={g.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{g.goal.name}</p>
                      <p className="text-xs text-gray-500">{g.goal.domain.name} | {g.goal.type === 'STANDARD' ? 'Standard' : 'Task Analysis'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{Math.round(g.progress)}%</p>
                        <div className="h-1.5 w-20 rounded-full bg-gray-200 mt-1">
                          <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${g.progress}%` }} />
                        </div>
                      </div>
                      <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', goalStatusColors[g.status])}>
                        {g.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Goals — Station 2 (Advanced Skills)
              </span>
            </h2>
            {station2Goals.length === 0 ? (
              <p className="text-sm text-gray-500">No active goals at Station 2.</p>
            ) : (
              <div className="space-y-3">
                {station2Goals.map(g => (
                  <div key={g.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{g.goal.name}</p>
                      <p className="text-xs text-gray-500">{g.goal.domain.name} | {g.goal.type === 'STANDARD' ? 'Standard' : 'Task Analysis'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{Math.round(g.progress)}%</p>
                        <div className="h-1.5 w-20 rounded-full bg-gray-200 mt-1">
                          <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${g.progress}%` }} />
                        </div>
                      </div>
                      <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', goalStatusColors[g.status])}>
                        {g.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Enrolled</dt>
                <dd className="text-sm text-gray-900">{new Date(student.enrolledAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Therapist</dt>
                <dd className="text-sm text-gray-900">
                  {student.owner ? `${student.owner.firstName} ${student.owner.lastName}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Station</dt>
                <dd className="text-sm text-gray-900">
                  {student.station ? (student.station === 'STATION_1' ? 'Station 1' : 'Station 2') : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg bg-white shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </span>
            </h2>
            {student.documents.length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {student.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 p-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">{doc.type.replace('_', ' ')}</p>
                    </div>
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
