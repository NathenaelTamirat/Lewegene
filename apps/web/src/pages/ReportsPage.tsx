import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ReportExport } from '../components/ReportExport';
import { SessionHistory } from '../components/SessionHistory';
import { SessionPDFPreview } from '../components/SessionPDFPreview';
import { BarChart3, FileText, Users, TrendingUp, ChevronDown, ChevronRight, StickyNote, Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ReportTab = 'sessions' | 'progress' | 'overview';

interface SessionSummary {
  id: string;
  totalTrials: number;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  student: { firstName: string; lastName: string };
  teacher: { firstName: string; lastName: string };
  station: string;
}

interface StudentProgress {
  student: { id: string; firstName: string; lastName: string; status: string };
  goals: {
    total: number;
    active: number;
    mastered: number;
    overallProgress: number;
    byStation: Record<string, Array<{ id: string; progress: number; goal: { name: string } }>>;
  };
}

interface FoundationOverview {
  totalStudents: number;
  activeStudents: number;
  masteredThisMonth: number;
  recentIncidents: number;
  activeTeachers: number;
  programDistribution: Array<{ programType: string; _count: number }>;
  therapyGroupDistribution: Array<{ therapyGroup: string; _count: number }>;
}

interface DirectorNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface IncidentTrendMonth {
  month: string;
  categories: Array<{ category: string; count: number }>;
  total: number;
}

interface IncidentTrendsResponse {
  trends: IncidentTrendMonth[];
  totalIncidents: number;
}

const INCIDENT_COLORS: Record<string, string> = {
  AGGRESSION: '#ef4444',
  SELF_INJURY: '#f97316',
  PROPERTY_DESTRUCTION: '#eab308',
  ESCAPE: '#a855f7',
  NON_COMPLIANCE: '#6366f1',
  VERBAL_OUTBURST: '#ec4899',
  OTHER: '#6b7280',
};

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sessions');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  const tabs = [
    { id: 'sessions' as const, label: 'Session Reports', icon: FileText },
    { id: 'progress' as const, label: 'Student Progress', icon: TrendingUp },
    { id: 'overview' as const, label: 'Foundation Overview', icon: BarChart3 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Oversight</h1>
        </div>
        <ReportExport
          activeTab={activeTab}
          dateFrom={dateFrom}
          dateTo={dateTo}
          studentFilter={studentFilter}
        />
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-500 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Student</label>
          <input type="text" value={studentFilter} onChange={e => setStudentFilter(e.target.value)} placeholder="Search..." className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>

      {activeTab === 'sessions' && <SessionReports dateFrom={dateFrom} dateTo={dateTo} studentFilter={studentFilter} />}
      {activeTab === 'progress' && <StudentProgressView studentFilter={studentFilter} />}
      {activeTab === 'overview' && <FoundationOverviewView />}
    </div>
  );
}

function SessionReports({ dateFrom, dateTo, studentFilter }: { dateFrom: string; dateTo: string; studentFilter: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['session-reports', dateFrom, dateTo, studentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      if (studentFilter) params.set('studentId', studentFilter);
      const res = await api.get(`/reports/session-reports?${params.toString()}`);
      return res.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Teacher</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Station</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trials</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data?.data?.map((s: SessionSummary) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {s.student.firstName} {s.student.lastName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {s.teacher.firstName} {s.teacher.lastName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {s.station === 'STATION_1' ? 'Station 1' : 'Station 2'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {new Date(s.startTime).toLocaleDateString()}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.totalTrials}</td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={cn('inline-flex rounded-full px-2 text-xs font-semibold', s.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
          {(!data?.data || data.data.length === 0) && (
            <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No session reports found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StudentProgressView({ studentFilter }: { studentFilter: string }) {
  const queryClient = useQueryClient();
  const [directorNotesOpen, setDirectorNotesOpen] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['student-progress', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/reports/student-progress/${studentFilter || 'all'}`);
      return res.data.data;
    },
    enabled: !!studentFilter,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery<IncidentTrendsResponse>({
    queryKey: ['incident-trends', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/reports/incident-trends?studentId=${studentFilter}`);
      return res.data.data;
    },
    enabled: !!studentFilter,
  });

  const { data: directorNotesData, isLoading: notesLoading } = useQuery({
    queryKey: ['director-notes', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/director-notes/student/${studentFilter}`);
      return res.data.data as DirectorNote[];
    },
    enabled: !!studentFilter && directorNotesOpen,
  });

  const { data: sessionSummariesData } = useQuery({
    queryKey: ['session-summaries-for-pdf', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/sessions/summaries?studentId=${studentFilter}`);
      return res.data.data;
    },
    enabled: !!studentFilter,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post('/director-notes', { studentId: studentFilter, content });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-notes', studentFilter] });
      setNewNoteContent('');
      setAddingNote(false);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await api.patch(`/director-notes/${id}`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-notes', studentFilter] });
      setEditingNoteId(null);
      setEditingNoteContent('');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/director-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-notes', studentFilter] });
    },
  });

  if (!studentFilter) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Student</h3>
        <p className="mt-1 text-sm text-gray-500">Enter a student ID above to view their progress.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner className="h-32" />;

  const progress = data as StudentProgress;
  if (!progress) return null;

  // Build PDF data from latest session summary
  const latestSummary = sessionSummariesData?.[0];
  let pdfData: any = null;
  if (latestSummary) {
    const goalDataEntries = Object.entries(latestSummary.goalData as Record<string, any>);
    pdfData = {
      date: new Date(latestSummary.startTime).toLocaleDateString(),
      timeRange: `${new Date(latestSummary.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(latestSummary.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      teacher: `${latestSummary.teacher.firstName} ${latestSummary.teacher.lastName}`,
      station: latestSummary.station === 'STATION_1' ? 'Station 1' : 'Station 2',
      goals: goalDataEntries.map(([id, gd]: [string, any]) => ({
        goalName: `Goal ${id.slice(0, 8)}…`,
        totalTrials: gd.total || 0,
        successes: gd.successes || 0,
        independence: gd.total > 0 ? Math.round(((gd.successes || 0) / gd.total) * 100) : 0,
        promptBreakdown: gd.prompts || {},
      })),
      incidents: [],
      notes: latestSummary.notes,
    };
  }

  const maxTrendTotal = Math.max(1, ...((trendsData?.trends || []).map(t => t.total)));

  return (
    <div className="space-y-6">
      {/* Goal Progress */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {progress.student.firstName} {progress.student.lastName} — Goal Progress
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">{progress.goals.total}</p>
            <p className="text-sm text-gray-500">Total Goals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-blue-600">{progress.goals.active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-600">{progress.goals.mastered}</p>
            <p className="text-sm text-gray-500">Mastered</p>
          </div>
        </div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Overall Progress</span>
          <span className="font-medium text-gray-900">{progress.goals.overallProgress}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div className="h-3 rounded-full bg-primary-500" style={{ width: `${progress.goals.overallProgress}%` }} />
        </div>
      </div>

      {Object.entries(progress.goals.byStation).map(([station, goals]) => (
        <div key={station} className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {station === 'STATION_1' ? 'Station 1 (Basic Skills)' : 'Station 2 (Advanced Skills)'}
          </h3>
          {goals.length === 0 ? (
            <p className="text-sm text-gray-500">No goals assigned.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g: { id: string; progress: number; goal: { name: string } }) => (
                <div key={g.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{g.goal.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 w-10 text-right">{Math.round(g.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Session History */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session History</h3>
        <SessionHistory studentId={studentFilter} />
      </div>

      {/* Behavior Incident Trends */}
      <div className="rounded-lg bg-white shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Incident Trends</h3>
        {trendsLoading ? (
          <LoadingSpinner className="h-24" />
        ) : !trendsData || trendsData.trends.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No incident data available.</p>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {Array.from(new Set(trendsData.trends.flatMap(t => t.categories.map(c => c.category)))).map(cat => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: INCIDENT_COLORS[cat] || '#6b7280' }}
                  />
                  {cat}
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="space-y-3">
              {trendsData.trends.map(trend => (
                <div key={trend.month} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-gray-500 shrink-0">
                    {new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex-1 flex items-center gap-1 h-6">
                    {trend.categories.map(cat => (
                      <div
                        key={cat.category}
                        className="h-full rounded-sm transition-all"
                        style={{
                          width: `${(cat.count / maxTrendTotal) * 100}%`,
                          backgroundColor: INCIDENT_COLORS[cat.category] || '#6b7280',
                          minWidth: cat.count > 0 ? '4px' : '0px',
                        }}
                        title={`${cat.category}: ${cat.count}`}
                      />
                    ))}
                  </div>
                  <span className="w-8 text-xs font-medium text-gray-700 text-right shrink-0">
                    {trend.total}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-right mt-2">
              Total: {trendsData.totalIncidents} incidents
            </p>
          </div>
        )}
      </div>

      {/* Director Notes */}
      <div className="rounded-lg bg-white shadow">
        <button
          onClick={() => setDirectorNotesOpen(!directorNotesOpen)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Director Notes</h3>
            {directorNotesData && (
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {directorNotesData.length}
              </span>
            )}
          </div>
          {directorNotesOpen ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {directorNotesOpen && (
          <div className="border-t border-gray-200 px-6 py-4">
            {/* Add Note Button */}
            {!addingNote && (
              <button
                onClick={() => setAddingNote(true)}
                className="mb-4 flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </button>
            )}

            {/* New Note Form */}
            {addingNote && (
              <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  placeholder="Write a director note..."
                  className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => createNoteMutation.mutate(newNoteContent)}
                    disabled={!newNoteContent.trim() || createNoteMutation.isPending}
                    className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {createNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingNote(false);
                      setNewNoteContent('');
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Notes List */}
            {notesLoading ? (
              <LoadingSpinner className="h-16" />
            ) : !directorNotesData || directorNotesData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No director notes yet.</p>
            ) : (
              <div className="space-y-3">
                {directorNotesData.map(note => (
                  <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteContent}
                          onChange={e => setEditingNoteContent(e.target.value)}
                          className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          rows={3}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => updateNoteMutation.mutate({ id: note.id, content: editingNoteContent })}
                            disabled={!editingNoteContent.trim() || updateNoteMutation.isPending}
                            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {updateNoteMutation.isPending ? 'Saving...' : 'Update'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditingNoteContent('');
                            }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {note.author.firstName} {note.author.lastName} —{' '}
                            {new Date(note.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this note?')) {
                                  deleteNoteMutation.mutate(note.id);
                                }
                              }}
                              className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Progress Report PDF */}
      <div className="rounded-lg bg-white shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Progress Report</h3>
            <p className="text-sm text-gray-500 mt-1">Generate a PDF progress report with aggregated session data.</p>
          </div>
          <button
            onClick={() => setShowPdfPreview(true)}
            disabled={!latestSummary}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4" />
            Generate Progress Report PDF
          </button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && pdfData && (
        <SessionPDFPreview data={pdfData} onClose={() => setShowPdfPreview(false)} />
      )}
    </div>
  );
}

function FoundationOverviewView() {
  const { data, isLoading } = useQuery<FoundationOverview>({
    queryKey: ['foundation-overview'],
    queryFn: async () => {
      const res = await api.get('/reports/foundation-overview');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-gray-900">{data.totalStudents}</p>
          <p className="text-sm text-gray-500">Total Students</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-green-600">{data.activeStudents}</p>
          <p className="text-sm text-gray-500">Active Therapy</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-purple-600">{data.masteredThisMonth}</p>
          <p className="text-sm text-gray-500">Mastered This Month</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow text-center">
          <p className="text-2xl font-semibold text-amber-600">{data.recentIncidents}</p>
          <p className="text-sm text-gray-500">Incidents (30d)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Program Distribution</h3>
          {data.programDistribution.map(item => (
            <div key={item.programType} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{item.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(item._count / data.totalStudents) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{item._count}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Therapy Group Distribution</h3>
          {data.therapyGroupDistribution.map(item => (
            <div key={item.therapyGroup} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{item.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy' : 'Functional Living Skills'}</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: `${(item._count / data.totalStudents) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{item._count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
