import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { ClipboardCheck, Plus, Play, CheckCircle, Eye, ArrowRight, AlertTriangle } from 'lucide-react';

interface Assessment {
  id: string;
  type: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
  reviewedAt: string | null;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

const assessmentTypes = [
  { value: 'SKILLS_ABLLS', label: 'Skills Assessment (ABLLS)', color: 'bg-blue-100 text-blue-800' },
  { value: 'BEHAVIOR_MASS', label: 'Behavior Assessment (MASS)', color: 'bg-amber-100 text-amber-800' },
  { value: 'BEHAVIOR_FAST', label: 'Behavior Assessment (FAST)', color: 'bg-orange-100 text-orange-800' },
  { value: 'PREFERENCE', label: 'Preference Assessment', color: 'bg-green-100 text-green-800' },
  { value: 'SENSORY_TIME', label: 'Sensory Time Engagement', color: 'bg-purple-100 text-purple-800' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETE: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-green-100 text-green-800',
};

interface SkillItem {
  name: string;
  score: number;
}

interface DomainSummary {
  domain: string;
  items: SkillItem[];
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalCount: number;
  isAreaOfNeed: boolean;
}

function NeedAnalysisSummary({ data }: { data: Record<string, unknown> }) {
  const domains = data.domains as Record<string, Array<{ name: string; score: number }>> | undefined;

  if (!domains || Object.keys(domains).length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-4">
        <p className="text-sm text-gray-500 italic">No skill data available for analysis.</p>
      </div>
    );
  }

  const domainSummaries: DomainSummary[] = Object.entries(domains).map(([domain, items]) => {
    const skillItems = Array.isArray(items) ? items : [];
    const redCount = skillItems.filter(i => i.score === 0).length;
    const yellowCount = skillItems.filter(i => i.score === 1).length;
    const greenCount = skillItems.filter(i => i.score === 2).length;
    const totalCount = skillItems.length;
    const needsCount = redCount + yellowCount;
    return {
      domain,
      items: skillItems.map(i => ({ name: i.name, score: i.score })),
      redCount,
      yellowCount,
      greenCount,
      totalCount,
      isAreaOfNeed: totalCount > 0 && (needsCount / totalCount) >= 0.5,
    };
  }).sort((a, b) => (b.redCount + b.yellowCount) - (a.redCount + a.yellowCount));

  const totalItems = domainSummaries.reduce((sum, d) => sum + d.totalCount, 0);
  const totalRed = domainSummaries.reduce((sum, d) => sum + d.redCount, 0);
  const totalYellow = domainSummaries.reduce((sum, d) => sum + d.yellowCount, 0);
  const totalGreen = domainSummaries.reduce((sum, d) => sum + d.greenCount, 0);
  const completionPct = totalItems > 0 ? Math.round(((totalRed + totalYellow + totalGreen) / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-blue-600" /> Need Analysis Summary
        </h3>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{totalItems}</p>
            <p className="text-xs text-gray-500">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">{totalGreen}</p>
            <p className="text-xs text-gray-500">Mastered (2)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-yellow-600">{totalYellow}</p>
            <p className="text-xs text-gray-500">Emerging (1)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">{totalRed}</p>
            <p className="text-xs text-gray-500">Not Acquired (0)</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Overall Completion</span>
          <span className="font-medium text-gray-900">{completionPct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden flex">
          {totalItems > 0 && (
            <>
              <div className="h-full bg-green-500" style={{ width: `${(totalGreen / totalItems) * 100}%` }} />
              <div className="h-full bg-yellow-500" style={{ width: `${(totalYellow / totalItems) * 100}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${(totalRed / totalItems) * 100}%` }} />
            </>
          )}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Green</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Yellow</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Red</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {domainSummaries.map(domain => (
          <div key={domain.domain} className={cn('rounded-lg border p-4 shadow-sm', domain.isAreaOfNeed ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white')}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">{domain.domain}</h4>
              {domain.isAreaOfNeed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <AlertTriangle className="h-3 w-3" /> Area of Need
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden flex mb-2">
              {domain.totalCount > 0 && (
                <>
                  <div className="h-full bg-green-500" style={{ width: `${(domain.greenCount / domain.totalCount) * 100}%` }} />
                  <div className="h-full bg-yellow-500" style={{ width: `${(domain.yellowCount / domain.totalCount) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(domain.redCount / domain.totalCount) * 100}%` }} />
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{domain.totalCount} items</span>
              <span className="flex gap-2">
                <span className="text-green-600">{domain.greenCount}g</span>
                <span className="text-yellow-600">{domain.yellowCount}y</span>
                <span className="text-red-600">{domain.redCount}r</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssessmentsPage() {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students-list'],
    queryFn: async () => {
      const res = await api.get('/students?limit=100&status=IN_ASSESSMENT');
      return res.data.data;
    },
  });

  const { data: assessments, isLoading } = useQuery<Assessment[]>({
    queryKey: ['assessments', selectedStudentId],
    queryFn: async () => {
      const res = await api.get(`/assessments/student/${selectedStudentId}`);
      return res.data.data;
    },
    enabled: !!selectedStudentId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { studentId: string; type: string }) => {
      return api.post('/assessments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setShowNewForm(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/assessments/${id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });

  const reviewMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/assessments/${id}/review`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessments'] }),
  });

  const inProgress = assessments?.filter(a => a.status === 'IN_PROGRESS' || a.status === 'DRAFT') || [];
  const completed = assessments?.filter(a => a.status === 'COMPLETE' || a.status === 'REVIEWED') || [];
  const skillsAblls = assessments?.filter(a => a.type === 'SKILLS_ABLLS' && (a.status === 'COMPLETE' || a.status === 'REVIEWED'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">6-Week Assessment</h1>
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
          {selectedStudentId && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" /> New Assessment
            </button>
          )}
        </div>
      </div>

      {showNewForm && selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">New Assessment</h2>
            <div className="space-y-2">
              {assessmentTypes.map(t => (
                <button
                  key={t.value}
                  onClick={() => createMutation.mutate({ studentId: selectedStudentId, type: t.value })}
                  className="flex w-full items-center justify-between rounded-md border border-gray-200 p-3 text-left hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">{t.label}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewForm(false)} className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {!selectedStudentId ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Student</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a student to view their assessment progress.</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="space-y-6">
          {skillsAblls && skillsAblls.length > 0 && (
            <div className="space-y-4">
              {skillsAblls.map(a => {
                const skillData = a.data as Record<string, unknown>;
                if (!skillData || Object.keys(skillData).length === 0) return null;
                return <NeedAnalysisSummary key={a.id} data={skillData} />;
              })}
            </div>
          )}

          {inProgress.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">In Progress</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map(a => {
                  const typeInfo = assessmentTypes.find(t => t.value === a.type);
                  return (
                    <div key={a.id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', typeInfo?.color || 'bg-gray-100 text-gray-800')}>
                          {typeInfo?.label || a.type}
                        </span>
                        <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', statusColors[a.status])}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Created {new Date(a.createdAt).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveAssessment(a)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => completeMutation.mutate(a.id)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3" /> Complete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Completed</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map(a => {
                  const typeInfo = assessmentTypes.find(t => t.value === a.type);
                  return (
                    <div key={a.id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm opacity-75">
                      <div className="flex items-start justify-between mb-2">
                        <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', typeInfo?.color || 'bg-gray-100 text-gray-800')}>
                          {typeInfo?.label || a.type}
                        </span>
                        <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', statusColors[a.status])}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {a.completedAt && `Completed ${new Date(a.completedAt).toLocaleDateString()}`}
                        {a.reviewedAt && ` | Reviewed ${new Date(a.reviewedAt).toLocaleDateString()}`}
                      </p>
                      {a.status === 'COMPLETE' && (
                        <button
                          onClick={() => reviewMutation.mutate(a.id)}
                          className="mt-2 w-full rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {inProgress.length === 0 && completed.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-sm text-gray-500">No assessments found for this student.</p>
            </div>
          )}
        </div>
      )}

      {activeAssessment && (
        <AssessmentDetail assessment={activeAssessment} onClose={() => setActiveAssessment(null)} />
      )}
    </div>
  );
}

function AssessmentDetail({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const typeInfo = assessmentTypes.find(t => t.value === assessment.type);
  const data = assessment.data as Record<string, unknown>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">{typeInfo?.label || assessment.type}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">Status:</span>{' '}
              <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', statusColors[assessment.status])}>
                {assessment.status}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Created:</span>{' '}
              <span className="text-gray-900">{new Date(assessment.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {assessment.type === 'SKILLS_ABLLS' && data && Object.keys(data).length > 0 ? (
            <NeedAnalysisSummary data={data} />
          ) : Object.keys(data).length > 0 ? (
            <div className="rounded-md bg-gray-50 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Assessment Data</h3>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No data recorded yet.</p>
          )}
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
      </div>
    </div>
  );
}
