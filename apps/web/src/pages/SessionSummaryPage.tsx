import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Send, Save, Eye, X, Clock, BookOpen } from 'lucide-react';

interface TrialEntry {
  id: string;
  promptLevel: string;
  outcome: 'SUCCESS' | 'FAILURE';
  notes: string | null;
  createdAt: string;
}

interface SessionSummary {
  id: string;
  station: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: string;
  teacher: { firstName: string; lastName: string };
  assignments: Array<{
    student: { id: string; firstName: string; lastName: string };
    goals: Array<{
      goal: { id: string; name: string; type: string };
      totalTrials: number;
      successes: number;
      independence: number;
      promptBreakdown: Record<string, number>;
    }>;
  }>;
  incidents: Array<{
    id: string;
    behaviorName: string;
    category: string;
    frequency: number;
    intensity: string;
    antecedent: string;
    consequence: string;
  }>;
}

interface ActiveBlock {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  station: string;
}

const promptColors: Record<string, string> = {
  INDEPENDENT: 'bg-green-100 text-green-800',
  GESTURAL: 'bg-blue-100 text-blue-800',
  VERBAL: 'bg-yellow-100 text-yellow-800',
  MODEL: 'bg-orange-100 text-orange-800',
  PHYSICAL: 'bg-red-100 text-red-800',
};

export function SessionSummaryPage() {
  const queryClient = useQueryClient();
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showTrialLogModal, setShowTrialLogModal] = useState<{ studentId: string; goalId: string; goalName: string } | null>(null);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  const { data: activeBlock, isLoading: blockLoading } = useQuery<ActiveBlock>({
    queryKey: ['active-block'],
    queryFn: async () => {
      const res = await api.get('/sessions/active-block');
      return res.data.data;
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<SessionSummary>({
    queryKey: ['session-summary', activeBlock?.id],
    queryFn: async () => {
      const res = await api.get(`/sessions/${activeBlock!.id}/summary`);
      return res.data.data;
    },
    enabled: !!activeBlock,
  });

  const { data: trialData, isLoading: trialsLoading } = useQuery<TrialEntry[]>({
    queryKey: ['trials', showTrialLogModal?.studentId, showTrialLogModal?.goalId],
    queryFn: async () => {
      const res = await api.get(`/trials/student/${showTrialLogModal!.studentId}?goalId=${showTrialLogModal!.goalId}`);
      return res.data.data;
    },
    enabled: !!showTrialLogModal,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/sessions/${activeBlock!.id}/submit`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-summary'] });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/sessions/${activeBlock!.id}/draft`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-summary'] });
    },
  });

  if (blockLoading || summaryLoading) return <LoadingSpinner className="h-64" />;

  if (!activeBlock) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Session Summary</h1>
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Session</h3>
          <p className="mt-1 text-sm text-gray-500">Session summary will appear here during an active session.</p>
        </div>
      </div>
    );
  }

  const duration = summary
    ? Math.round((new Date(summary.endTime).getTime() - new Date(summary.startTime).getTime()) / 60000)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Session Summary</h1>
          <p className="text-sm text-gray-500">
            {summary?.teacher.firstName} {summary?.teacher.lastName} — {activeBlock.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => saveDraftMutation.mutate()}
            disabled={saveDraftMutation.isPending}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save Draft
          </button>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Submit & End Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs font-medium text-gray-500">STATION</p>
          <p className="text-lg font-semibold text-gray-900">{summary?.station === 'STATION_1' ? 'Station 1' : 'Station 2'}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs font-medium text-gray-500">TIME</p>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(activeBlock.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(activeBlock.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-gray-500">{duration} minutes</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs font-medium text-gray-500">STATUS</p>
          <span className={cn(
            'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
            summary?.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          )}>
            {summary?.status || 'IN PROGRESS'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {summary?.assignments.map((assignment, idx) => {
          const studentKey = `student-${idx}`;
          const isExpanded = expandedStudent === studentKey;

          return (
            <div key={idx} className="rounded-lg bg-white border border-gray-200 shadow-sm">
              <button
                onClick={() => setExpandedStudent(isExpanded ? null : studentKey)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                    {assignment.student.firstName[0]}{assignment.student.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{assignment.student.firstName} {assignment.student.lastName}</p>
                    <p className="text-xs text-gray-500">{assignment.goals.length} goals</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-3">
                  {assignment.goals.map((goalData, gIdx) => (
                    <div key={gIdx} className="rounded-md bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">{goalData.goal.name}</p>
                        <span className="text-sm font-semibold text-primary-600">{goalData.independence}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="block font-medium">Total Trials</span>
                          <span className="text-gray-900">{goalData.totalTrials}</span>
                        </div>
                        <div>
                          <span className="block font-medium">Successes</span>
                          <span className="text-green-600">{goalData.successes}</span>
                        </div>
                        <div>
                          <span className="block font-medium">Failures</span>
                          <span className="text-red-600">{goalData.totalTrials - goalData.successes}</span>
                        </div>
                      </div>
                      {Object.keys(goalData.promptBreakdown).length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {Object.entries(goalData.promptBreakdown).map(([level, count]) => (
                            <span key={level} className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', promptColors[level] || 'bg-gray-200 text-gray-700')}>
                              {level}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setShowTrialLogModal({ studentId: assignment.student.id, goalId: goalData.goal.id, goalName: goalData.goal.name })}
                        className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
                      >
                        <Eye className="h-3 w-3" /> View Trial Log
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {summary?.incidents && summary.incidents.length > 0 && (
        <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Behavior Incidents ({summary.incidents.length})
          </h3>
          <div className="space-y-2">
            {summary.incidents.map(incident => {
              const isExpanded = expandedIncident === incident.id;
              return (
                <div key={incident.id} className="rounded-md bg-amber-50 overflow-hidden">
                  <button
                    onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{incident.behaviorName}</span>
                      <span className="text-xs text-gray-500">({incident.category})</span>
                      <span className="text-xs text-gray-500">x{incident.frequency} — {incident.intensity}</span>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-amber-100 px-3 py-2 text-xs text-gray-600 space-y-1 bg-amber-100/30">
                      <p><span className="font-medium text-gray-700">Antecedent:</span> {incident.antecedent || 'None recorded'}</p>
                      <p><span className="font-medium text-gray-700">Consequence:</span> {incident.consequence || 'None recorded'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white p-4 shadow">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Teacher Qualitative Notes</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about today's session..."
          rows={4}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {showTrialLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary-600" /> Trial Log
                </h2>
                <p className="text-sm text-gray-500">{showTrialLogModal.goalName}</p>
              </div>
              <button
                onClick={() => { setShowTrialLogModal(null); setExpandedIncident(null); }}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {trialsLoading ? (
                <LoadingSpinner className="h-32" />
              ) : trialData && trialData.length > 0 ? (
                <div className="space-y-2">
                  {trialData.map((trial, idx) => (
                    <div key={trial.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {new Date(trial.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', promptColors[trial.promptLevel] || 'bg-gray-200 text-gray-700')}>
                            {trial.promptLevel}
                          </span>
                          {trial.outcome === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircle className="h-3 w-3" /> Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                              <X className="h-3 w-3" /> Failure
                            </span>
                          )}
                        </div>
                        {trial.notes && (
                          <p className="mt-1 text-xs text-gray-500">{trial.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No trial entries found for this goal.</p>
              )}

              {summary?.incidents && summary.incidents.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Behavior Incidents
                  </h4>
                  <div className="space-y-2">
                    {summary.incidents.map(incident => {
                      const isExpanded = expandedIncident === incident.id;
                      return (
                        <div key={incident.id} className="rounded-md bg-amber-50 overflow-hidden">
                          <button
                            onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{incident.behaviorName}</span>
                              <span className="text-xs text-gray-500">x{incident.frequency}</span>
                            </div>
                            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                          {isExpanded && (
                            <div className="border-t border-amber-100 px-3 py-2 text-xs text-gray-600 space-y-1 bg-amber-100/30">
                              <p><span className="font-medium text-gray-700">Category:</span> {incident.category}</p>
                              <p><span className="font-medium text-gray-700">Intensity:</span> {incident.intensity}</p>
                              <p><span className="font-medium text-gray-700">Antecedent:</span> {incident.antecedent || 'None recorded'}</p>
                              <p><span className="font-medium text-gray-700">Consequence:</span> {incident.consequence || 'None recorded'}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-6 py-3">
              <button
                onClick={() => { setShowTrialLogModal(null); setExpandedIncident(null); }}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
