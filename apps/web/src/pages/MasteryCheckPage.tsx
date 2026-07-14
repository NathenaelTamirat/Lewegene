import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { Award, CheckCircle, XCircle, AlertTriangle, Send, Users } from 'lucide-react';

interface MasteryCheck {
  id: string;
  goalName: string;
  studentName: string;
  status: string;
  independence: number;
  totalTrials: number;
  successes: number;
  primaryTeacher: string;
  verifierA: { name: string; outcome: string | null; notes: string | null } | null;
  verifierB: { name: string; outcome: string | null; notes: string | null } | null;
  approver: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

interface EligibleGoal {
  goalId: string;
  goalName: string;
  studentId: string;
  studentName: string;
  independence: number;
  totalTrials: number;
  successes: number;
}

export function MasteryCheckPage() {
  const queryClient = useQueryClient();
  const [selectedCheck, setSelectedCheck] = useState<MasteryCheck | null>(null);
  const [activeTab, setActiveTab] = useState<'eligible' | 'pending' | 'completed'>('eligible');

  const { data: eligibleGoals, isLoading: eligibleLoading } = useQuery<EligibleGoal[]>({
    queryKey: ['mastery-eligible'],
    queryFn: async () => {
      const res = await api.get('/trials/mastery-eligible');
      return res.data.data || [];
    },
  });

  const { data: pendingChecks, isLoading: pendingLoading } = useQuery<MasteryCheck[]>({
    queryKey: ['mastery-checks', 'pending'],
    queryFn: async () => {
      const res = await api.get('/trials/mastery-checks?status=PENDING_APPROVAL');
      return res.data.data || [];
    },
  });

  const { data: completedChecks, isLoading: completedLoading } = useQuery<MasteryCheck[]>({
    queryKey: ['mastery-checks', 'completed'],
    queryFn: async () => {
      const res = await api.get('/trials/mastery-checks?status=MASTERED');
      return res.data.data || [];
    },
  });

  const initiateMutation = useMutation({
    mutationFn: async (data: { goalId: string; studentId: string }) => {
      return api.post('/trials/mastery-checks/initiate', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mastery-eligible'] });
      queryClient.invalidateQueries({ queryKey: ['mastery-checks'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: { checkId: string; outcome: string; notes?: string }) => {
      return api.post(`/trials/mastery-checks/${data.checkId}/verify`, { outcome: data.outcome, notes: data.notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mastery-checks'] });
      setSelectedCheck(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: { checkId: string; decision: string; reason?: string }) => {
      return api.post(`/trials/mastery-checks/${data.checkId}/approve`, { decision: data.decision, reason: data.reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mastery-checks'] });
      setSelectedCheck(null);
    },
  });

  const tabs = [
    { id: 'eligible' as const, label: 'Eligible for Mastery' },
    { id: 'pending' as const, label: 'Pending Verification' },
    { id: 'completed' as const, label: 'Completed' },
  ];

  const isLoading = eligibleLoading || pendingLoading || completedLoading;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Award className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Goal Mastery Check</h1>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <>
          {activeTab === 'eligible' && (
            <EligibleGoalsTab
              goals={eligibleGoals || []}
              onInitiate={(goalId, studentId) => initiateMutation.mutate({ goalId, studentId })}
              isPending={initiateMutation.isPending}
            />
          )}
          {activeTab === 'pending' && (
            <PendingChecksTab
              checks={pendingChecks || []}
              onSelect={setSelectedCheck}
              currentUserRole="TEACHER"
            />
          )}
          {activeTab === 'completed' && (
            <CompletedChecksTab checks={completedChecks || []} onSelect={setSelectedCheck} />
          )}
        </>
      )}

      {selectedCheck && (
        <MasteryCheckDetail
          check={selectedCheck}
          onClose={() => setSelectedCheck(null)}
          onVerify={(outcome, notes) => verifyMutation.mutate({ checkId: selectedCheck.id, outcome, notes })}
          onApprove={(decision, reason) => approveMutation.mutate({ checkId: selectedCheck.id, decision, reason })}
          isVerifyPending={verifyMutation.isPending}
          isApprovePending={approveMutation.isPending}
        />
      )}
    </div>
  );
}

function EligibleGoalsTab({
  goals,
  onInitiate,
  isPending,
}: {
  goals: EligibleGoal[];
  onInitiate: (goalId: string, studentId: string) => void;
  isPending: boolean;
}) {
  if (goals.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <Award className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Goals Eligible</h3>
        <p className="mt-1 text-sm text-gray-500">No goals currently meet the independence threshold for mastery check.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal, idx) => (
        <div key={idx} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{goal.goalName}</p>
              <p className="text-sm text-gray-500">{goal.studentName}</p>
              <p className="text-xs text-gray-400">
                {goal.successes}/{goal.totalTrials} trials — {goal.independence}% independence
              </p>
            </div>
          </div>
          <button
            onClick={() => onInitiate(goal.goalId, goal.studentId)}
            disabled={isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Initiate Mastery Check
          </button>
        </div>
      ))}
    </div>
  );
}

function PendingChecksTab({
  checks,
  onSelect,
  currentUserRole,
}: {
  checks: MasteryCheck[];
  onSelect: (check: MasteryCheck) => void;
  currentUserRole: string;
}) {
  if (checks.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Pending Checks</h3>
        <p className="mt-1 text-sm text-gray-500">No mastery checks are currently awaiting verification or approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checks.map(check => {
        const needsVerification = !check.verifierA?.outcome || !check.verifierB?.outcome;
        const needsApproval = check.status === 'PENDING_APPROVAL';

        return (
          <div key={check.id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{check.goalName}</p>
                <p className="text-sm text-gray-500">{check.studentName}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-400">{check.independence}% independence</span>
                  {needsVerification && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      <Users className="h-3 w-3" /> Needs Verification
                    </span>
                  )}
                  {needsApproval && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      <Send className="h-3 w-3" /> Needs Approval
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onSelect(check)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Review
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompletedChecksTab({
  checks,
  onSelect,
}: {
  checks: MasteryCheck[];
  onSelect: (check: MasteryCheck) => void;
}) {
  if (checks.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Completed Checks</h3>
        <p className="mt-1 text-sm text-gray-500">No mastery checks have been completed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checks.map(check => (
        <div key={check.id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm opacity-75">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{check.goalName}</p>
              <p className="text-sm text-gray-500">{check.studentName}</p>
              <p className="text-xs text-gray-400">
                Approved by {check.approver} on {check.approvedAt ? new Date(check.approvedAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
              MASTERED
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MasteryCheckDetail({
  check,
  onClose,
  onVerify,
  onApprove,
  isVerifyPending,
  isApprovePending,
}: {
  check: MasteryCheck;
  onClose: () => void;
  onVerify: (outcome: string, notes?: string) => void;
  onApprove: (decision: string, reason?: string) => void;
  isVerifyPending: boolean;
  isApprovePending: boolean;
}) {
  const [verifyOutcome, setVerifyOutcome] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [approveDecision, setApproveDecision] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const canVerify = !check.verifierA?.outcome || !check.verifierB?.outcome;
  const canApprove = check.status === 'PENDING_APPROVAL' && check.verifierA?.outcome && check.verifierB?.outcome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Mastery Check Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">{check.goalName}</p>
            <p className="text-sm text-gray-500">{check.studentName}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-gray-500">Independence: <span className="font-medium text-gray-900">{check.independence}%</span></span>
              <span className="text-gray-500">Trials: <span className="font-medium text-gray-900">{check.successes}/{check.totalTrials}</span></span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Primary Teacher (A)</h3>
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              {check.primaryTeacher} — Confirmed 100% independence
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Verifier B</h3>
            {check.verifierA?.outcome ? (
              <div className={cn(
                'rounded-md p-3 text-sm',
                check.verifierA.outcome === 'SUCCESS' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              )}>
                {check.verifierA.name}: {check.verifierA.outcome}
                {check.verifierA.notes && <p className="mt-1 text-xs opacity-75">Notes: {check.verifierA.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Awaiting verification</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Verifier C</h3>
            {check.verifierB?.outcome ? (
              <div className={cn(
                'rounded-md p-3 text-sm',
                check.verifierB.outcome === 'SUCCESS' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              )}>
                {check.verifierB.name}: {check.verifierB.outcome}
                {check.verifierB.notes && <p className="mt-1 text-xs opacity-75">Notes: {check.verifierB.notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Awaiting verification</p>
            )}
          </div>

          {canVerify && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-3">Enter Verification</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setVerifyOutcome('SUCCESS')}
                    className={cn(
                      'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium',
                      verifyOutcome === 'SUCCESS' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    <CheckCircle className="h-4 w-4 inline mr-1" /> Success
                  </button>
                  <button
                    onClick={() => setVerifyOutcome('FAILURE')}
                    className={cn(
                      'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium',
                      verifyOutcome === 'FAILURE' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    <XCircle className="h-4 w-4 inline mr-1" /> Failure
                  </button>
                </div>
                <textarea
                  value={verifyNotes}
                  onChange={e => setVerifyNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={() => onVerify(verifyOutcome, verifyNotes)}
                  disabled={!verifyOutcome || isVerifyPending}
                  className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isVerifyPending ? 'Submitting...' : 'Submit Verification'}
                </button>
              </div>
            </div>
          )}

          {canApprove && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Approval Decision</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setApproveDecision('APPROVE'); setRejectReason(''); }}
                    className={cn(
                      'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium',
                      approveDecision === 'APPROVE' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    <CheckCircle className="h-4 w-4 inline mr-1" /> Approve
                  </button>
                  <button
                    onClick={() => setApproveDecision('REJECT')}
                    className={cn(
                      'flex-1 rounded-md border-2 px-3 py-2 text-sm font-medium',
                      approveDecision === 'REJECT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'
                    )}
                  >
                    <XCircle className="h-4 w-4 inline mr-1" /> Reject
                  </button>
                </div>
                {approveDecision === 'REJECT' && (
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    rows={2}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                )}
                <button
                  onClick={() => onApprove(approveDecision, rejectReason)}
                  disabled={!approveDecision || (approveDecision === 'REJECT' && !rejectReason) || isApprovePending}
                  className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isApprovePending ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          )}

          {check.rejectionReason && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Rejected: {check.rejectionReason}
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-6 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>
  );
}
