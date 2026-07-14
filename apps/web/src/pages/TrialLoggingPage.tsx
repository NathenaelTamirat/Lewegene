import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { Clock, AlertTriangle, CheckCircle, ArrowLeftRight, Send, FileText, Layers } from 'lucide-react';

interface SessionAssignment {
  id: string;
  station: string;
  teacher: { id: string; firstName: string; lastName: string };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    headshotUrl: string | null;
  };
}

interface SessionBlock {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  assignments: SessionAssignment[];
}

interface GoalAssignment {
  id: string;
  station: string;
  status: string;
  progress: number;
  goal: {
    id: string;
    name: string;
    type: string;
    domain: { name: string };
  };
}

interface Trial {
  id: string;
  promptLevel: string;
  outcome: string;
  notes: string | null;
  timestamp: string;
  goal: { goal: { name: string } };
  step: { name: string } | null;
  stepIndex: number | null;
}

interface TaskAnalysisStep {
  id: string;
  name: string;
  order: number;
  masteryCriteria: number;
}

const defaultPrompts = [
  { label: 'FP', fullName: 'Full Physical', color: '#EF4444' },
  { label: 'PP', fullName: 'Partial Physical', color: '#F59E0B' },
  { label: 'G', fullName: 'Gesture', color: '#3B82F6' },
  { label: 'V', fullName: 'Verbal', color: '#10B981' },
  { label: 'I', fullName: 'Independent', color: '#8B5CF6' },
];

export function TrialLoggingPage() {
  const queryClient = useQueryClient();
  const [activeStudentIdx, setActiveStudentIdx] = useState(0);
  const [activeGoalIdx, setActiveGoalIdx] = useState(0);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [trialNotes, setTrialNotes] = useState('');
  const [isTaskAnalysisMode, setIsTaskAnalysisMode] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  const { data: activeBlock, isLoading: blockLoading } = useQuery<SessionBlock>({
    queryKey: ['active-block'],
    queryFn: async () => {
      const res = await api.get('/sessions/active-block');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const myAssignments = activeBlock?.assignments || [];
  const activeAssignment = myAssignments[activeStudentIdx];
  const secondaryAssignment = myAssignments[activeStudentIdx === 0 ? 1 : 0];

  const { data: goals } = useQuery<GoalAssignment[]>({
    queryKey: ['caseload', activeAssignment?.student.id],
    queryFn: async () => {
      const res = await api.get(`/goals/caseload/${activeAssignment!.student.id}`);
      const data = res.data.data;
      return [...(data.STATION_1 || []), ...(data.STATION_2 || [])];
    },
    enabled: !!activeAssignment,
  });

  const activeGoal = goals?.[activeGoalIdx];

  const isTaskAnalysisGoal = activeGoal?.goal.type === 'TASK_ANALYSIS';

  const { data: taskSteps } = useQuery<TaskAnalysisStep[]>({
    queryKey: ['task-steps', activeGoal?.goal.id],
    queryFn: async () => {
      const res = await api.get(`/goals/${activeGoal!.goal.id}/steps`);
      return res.data.data || [];
    },
    enabled: !!activeGoal && isTaskAnalysisGoal,
  });

  const { data: trials } = useQuery<Trial[]>({
    queryKey: ['trials', activeAssignment?.student.id, activeGoal?.id],
    queryFn: async () => {
      const res = await api.get(`/trials/student/${activeAssignment!.student.id}?goalId=${activeGoal!.id}`);
      return res.data.data;
    },
    enabled: !!activeAssignment && !!activeGoal,
  });

  const logTrialMutation = useMutation({
    mutationFn: async (data: { studentId: string; goalId: string; promptLevel: string; outcome: string; notes?: string; stepIndex?: number }) => {
      return api.post('/trials', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['caseload'] });
      setTrialNotes('');
    },
  });

  const handleTrialLog = (outcome: 'SUCCESS' | 'FAILURE') => {
    if (!activeAssignment || !activeGoal) return;
    const promptLevel = defaultPrompts[activeGoalIdx % defaultPrompts.length].label;
    logTrialMutation.mutate({
      studentId: activeAssignment.student.id,
      goalId: activeGoal.id,
      promptLevel,
      outcome,
      notes: trialNotes || undefined,
      stepIndex: isTaskAnalysisMode && taskSteps ? activeStepIdx : undefined,
    });
  };

  const handleTaskStepLog = (outcome: 'SUCCESS' | 'FAILURE') => {
    if (!activeAssignment || !activeGoal || !taskSteps) return;
    const promptLevel = defaultPrompts[activeGoalIdx % defaultPrompts.length].label;
    logTrialMutation.mutate({
      studentId: activeAssignment.student.id,
      goalId: activeGoal.id,
      promptLevel,
      outcome,
      notes: trialNotes || undefined,
      stepIndex: activeStepIdx,
    });
  };

  const swapActiveStudent = () => {
    if (myAssignments.length < 2) return;
    setActiveStudentIdx(activeStudentIdx === 0 ? 1 : 0);
    setActiveGoalIdx(0);
  };

  const now = new Date();
  const endTime = activeBlock ? new Date(activeBlock.endTime) : now;
  const minutesLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 60000));

  if (blockLoading) return <LoadingSpinner className="h-64" />;

  if (!activeBlock) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Today's Session</h1>
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Session</h3>
          <p className="mt-1 text-sm text-gray-500">There is no active session block right now.</p>
        </div>
      </div>
    );
  }

  if (myAssignments.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Today's Session</h1>
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <h3 className="text-sm font-medium text-gray-900">No Assignments</h3>
          <p className="mt-1 text-sm text-gray-500">You have no student assignments for this block.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{activeBlock.name}</h1>
          <p className="text-sm text-gray-500">
            {new Date(activeBlock.startTime).toLocaleTimeString()} — {new Date(activeBlock.endTime).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
            minutesLeft <= 5 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          )}>
            <Clock className="h-4 w-4" />
            {minutesLeft} min left
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {activeAssignment && (
            <StudentCard
              assignment={activeAssignment}
              isActive
              goals={goals || []}
              activeGoalIdx={activeGoalIdx}
              onGoalSelect={(idx) => { setActiveGoalIdx(idx); setActiveStepIdx(0); }}
              trials={trials || []}
              prompts={defaultPrompts}
              onTrialLog={handleTrialLog}
              trialNotes={trialNotes}
              onNotesChange={setTrialNotes}
              isLogging={logTrialMutation.isPending}
              onReportIncident={() => setShowIncidentModal(true)}
              isTaskAnalysisMode={isTaskAnalysisMode}
              onToggleTaskAnalysis={() => { setIsTaskAnalysisMode(!isTaskAnalysisMode); setActiveStepIdx(0); }}
              taskSteps={taskSteps || []}
              activeStepIdx={activeStepIdx}
              onStepSelect={setActiveStepIdx}
              onTaskStepLog={handleTaskStepLog}
            />
          )}

          {secondaryAssignment && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 text-sm font-bold">
                    {secondaryAssignment.student.firstName[0]}{secondaryAssignment.student.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">
                      {secondaryAssignment.student.firstName} {secondaryAssignment.student.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {secondaryAssignment.station === 'STATION_1' ? 'Station 1' : 'Station 2'} — Secondary
                    </p>
                  </div>
                </div>
                <button
                  onClick={swapActiveStudent}
                  className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Swap
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white shadow p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowIncidentModal(true)}
                className="flex w-full items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                <AlertTriangle className="h-4 w-4" />
                Log Behavior Incident
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FileText className="h-4 w-4" />
                View Student Profile
              </button>
            </div>
          </div>

          {activeGoal && (
            <div className="rounded-lg bg-white shadow p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Current Goal</h3>
              <p className="text-sm text-gray-700 font-medium">{activeGoal.goal.name}</p>
              <p className="text-xs text-gray-500 mt-1">{activeGoal.goal.domain.name} | {activeGoal.goal.type === 'STANDARD' ? 'Standard' : 'Task Analysis'}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(activeGoal.progress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-primary-500" style={{ width: `${activeGoal.progress}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white shadow p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Trials</h3>
            {(!trials || trials.length === 0) ? (
              <p className="text-xs text-gray-400 italic">No trials logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {trials.slice(0, 10).map(trial => (
                  <div key={trial.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                        trial.outcome === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'
                      )}>
                        {trial.outcome === 'SUCCESS' ? 'S' : 'F'}
                      </span>
                      <span className="text-gray-600">{trial.promptLevel}</span>
                    </div>
                    <span className="text-gray-400">{new Date(trial.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showIncidentModal && activeAssignment && (
        <BehaviorIncidentModal
          studentId={activeAssignment.student.id}
          onClose={() => setShowIncidentModal(false)}
          onSuccess={() => {
            setShowIncidentModal(false);
            queryClient.invalidateQueries({ queryKey: ['behavior-incidents'] });
          }}
        />
      )}
    </div>
  );
}

function StudentCard({
  assignment,
  isActive,
  goals,
  activeGoalIdx,
  onGoalSelect,
  trials,
  prompts,
  onTrialLog,
  trialNotes,
  onNotesChange,
  isLogging,
  onReportIncident,
  isTaskAnalysisMode,
  onToggleTaskAnalysis,
  taskSteps,
  activeStepIdx,
  onStepSelect,
  onTaskStepLog,
}: {
  assignment: SessionAssignment;
  isActive: boolean;
  goals: GoalAssignment[];
  activeGoalIdx: number;
  onGoalSelect: (idx: number) => void;
  trials: Trial[];
  prompts: typeof defaultPrompts;
  onTrialLog: (outcome: 'SUCCESS' | 'FAILURE') => void;
  trialNotes: string;
  onNotesChange: (notes: string) => void;
  isLogging: boolean;
  onReportIncident: () => void;
  isTaskAnalysisMode: boolean;
  onToggleTaskAnalysis: () => void;
  taskSteps: TaskAnalysisStep[];
  activeStepIdx: number;
  onStepSelect: (idx: number) => void;
  onTaskStepLog: (outcome: 'SUCCESS' | 'FAILURE') => void;
}) {
  const activeGoal = goals[activeGoalIdx];
  const isTaskAnalysis = activeGoal?.goal.type === 'TASK_ANALYSIS';

  return (
    <div className={cn(
      'rounded-lg shadow p-6',
      isActive ? 'bg-white border-2 border-primary-500' : 'bg-gray-50 border border-gray-200'
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold',
            isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
          )}>
            {assignment.student.headshotUrl ? (
              <img src={assignment.student.headshotUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span>{assignment.student.firstName[0]}{assignment.student.lastName[0]}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {assignment.student.firstName} {assignment.student.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {assignment.station === 'STATION_1' ? 'Station 1' : 'Station 2'}
              {isActive ? ' — Active' : ' — Secondary'}
            </p>
          </div>
        </div>
        {isActive && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>

      {goals.length > 0 && (
        <div className="flex gap-2 mb-4">
          {goals.slice(0, 2).map((g, idx) => (
            <button
              key={g.id}
              onClick={() => onGoalSelect(idx)}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeGoalIdx === idx
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              )}
            >
              <span className="block truncate">{g.goal.name}</span>
              <span className="block text-xs opacity-70">{Math.round(g.progress)}%</span>
            </button>
          ))}
        </div>
      )}

      {isActive && (
        <div className="space-y-4">
          {isTaskAnalysis && (
            <div className="rounded-md bg-blue-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Task Analysis Mode</span>
                </div>
                <button
                  onClick={onToggleTaskAnalysis}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium',
                    isTaskAnalysisMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  )}
                >
                  {isTaskAnalysisMode ? 'ON' : 'OFF'}
                </button>
              </div>
              {isTaskAnalysisMode && taskSteps.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {taskSteps.map((step, idx) => {
                    const stepTrials = trials.filter(t => t.stepIndex === idx);
                    const stepSuccesses = stepTrials.filter(t => t.outcome === 'SUCCESS').length;
                    const independence = stepTrials.length > 0 ? Math.round((stepSuccesses / stepTrials.length) * 100) : 0;

                    return (
                      <button
                        key={step.id}
                        onClick={() => onStepSelect(idx)}
                        className={cn(
                          'rounded-md border-2 px-3 py-2 text-left transition-colors',
                          activeStepIdx === idx
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <span className="block text-xs font-medium">Step {idx + 1}</span>
                        <span className="block text-xs truncate max-w-[120px]">{step.name}</span>
                        <span className="block text-[10px] text-gray-400">{independence}% | {stepTrials.length} trials</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">TRIAL STREAM</p>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {trials.slice(0, 15).map(trial => (
                <div
                  key={trial.id}
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white',
                    trial.outcome === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'
                  )}
                  title={`${trial.promptLevel} - ${trial.outcome}`}
                >
                  {trial.promptLevel}
                </div>
              ))}
              {trials.length === 0 && (
                <span className="text-xs text-gray-400 italic">No trials yet</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">PROMPT ENTRY</p>
            <div className="flex gap-2">
              {prompts.map(p => (
                <button
                  key={p.label}
                  onClick={() => isTaskAnalysisMode ? onTaskStepLog('SUCCESS') : onTrialLog('SUCCESS')}
                  disabled={isLogging}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  style={{ backgroundColor: p.color }}
                  title={p.fullName}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => isTaskAnalysisMode ? onTaskStepLog('SUCCESS') : onTrialLog('SUCCESS')}
              disabled={isLogging}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 active:scale-[0.98]"
            >
              <CheckCircle className="h-4 w-4" />
              Success
            </button>
            <button
              onClick={() => isTaskAnalysisMode ? onTaskStepLog('FAILURE') : onTrialLog('FAILURE')}
              disabled={isLogging}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 active:scale-[0.98]"
            >
              <AlertTriangle className="h-4 w-4" />
              Failure
            </button>
          </div>

          <div>
            <textarea
              value={trialNotes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Optional trial notes..."
              rows={2}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BehaviorIncidentModal({
  studentId,
  onClose,
  onSuccess,
}: {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    behaviorName: '',
    category: '',
    frequency: 1,
    intensity: 'Low',
    location: '',
    antecedent: '',
    consequence: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return api.post('/behavior-incidents', { ...data, studentId });
    },
    onSuccess,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Log Behavior Incident</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Behavior Name *</label>
              <input value={form.behaviorName} onChange={e => setForm({ ...form, behaviorName: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="">Select...</option>
                <option value="AGGRESSION">Aggression</option>
                <option value="SELF_INJURY">Self-Injury</option>
                <option value="PROPERTY_DESTRUCTION">Property Destruction</option>
                <option value="NON_COMPLIANCE">Non-Compliance</option>
                <option value="VERBAL_OUTBURST">Verbal Outburst</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <input type="number" value={form.frequency} onChange={e => setForm({ ...form, frequency: parseInt(e.target.value) || 1 })} min={1} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Intensity</label>
              <select value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Antecedent *</label>
            <textarea value={form.antecedent} onChange={e => setForm({ ...form, antecedent: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Consequence *</label>
            <textarea value={form.consequence} onChange={e => setForm({ ...form, consequence: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.behaviorName || !form.antecedent || !form.consequence || createMutation.isPending}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Log Incident
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
