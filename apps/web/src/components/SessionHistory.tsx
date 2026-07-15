import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ChevronDown, ChevronRight, Clock, User, Target } from 'lucide-react';
import { cn } from '../lib/utils';

interface SessionSummary {
  id: string;
  sessionId: string;
  studentId: string;
  teacherId: string;
  station: string;
  startTime: string;
  endTime: string;
  totalTrials: number;
  goalData: Record<string, {
    total: number;
    successes: number;
    failures: number;
    prompts: Record<string, number>;
  }>;
  notes: string | null;
  status: string;
  submittedAt: string | null;
  student: { firstName: string; lastName: string };
  teacher: { firstName: string; lastName: string };
  session: { name: string; startTime: string; endTime: string };
}

interface SessionHistoryProps {
  studentId: string;
}

export function SessionHistory({ studentId }: SessionHistoryProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['session-history', studentId],
    queryFn: async () => {
      const res = await api.get(`/sessions/summaries?studentId=${studentId}`);
      return res.data.data as SessionSummary[];
    },
    enabled: !!studentId,
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) return <LoadingSpinner className="h-24" />;

  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow text-center">
        <Clock className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No session history found.</p>
      </div>
    );
  }

  // Group sessions by date
  const grouped: Record<string, SessionSummary[]> = {};
  for (const session of sessions) {
    const dateKey = new Date(session.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(session);
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateLabel, daySessions]) => (
        <div key={dateLabel}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {dateLabel}
          </h4>
          <div className="space-y-2">
            {daySessions.map(session => {
              const isExpanded = expandedIds.has(session.id);
              const goalEntries = Object.entries(session.goalData);
              const totalSuccesses = goalEntries.reduce((sum, [, g]) => sum + g.successes, 0);
              const totalFailures = goalEntries.reduce((sum, [, g]) => sum + g.failures, 0);
              const totalAll = totalSuccesses + totalFailures;
              const independencePct = totalAll > 0 ? Math.round((totalSuccesses / totalAll) * 100) : 0;

              const startStr = new Date(session.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });
              const endStr = new Date(session.endTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <div
                  key={session.id}
                  className="rounded-lg border border-gray-200 bg-white shadow-sm"
                >
                  <button
                    onClick={() => toggleExpand(session.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <span>{startStr} – {endStr}</span>
                          <span className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            session.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}>
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {session.teacher.firstName} {session.teacher.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {session.station === 'STATION_1' ? 'Station 1' : 'Station 2'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="text-gray-500">
                          <span className="font-medium text-gray-900">{session.totalTrials}</span> trials
                        </p>
                        <p className="text-green-600">{independencePct}% independence</p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      {session.session && (
                        <p className="mb-2 text-xs text-gray-500">
                          Session Block: <span className="font-medium text-gray-700">{session.session.name}</span>
                        </p>
                      )}

                      {goalEntries.length === 0 ? (
                        <p className="text-xs text-gray-400">No trial data recorded.</p>
                      ) : (
                        <div className="space-y-2">
                          {goalEntries.map(([goalId, goalData]) => {
                            const gTotal = goalData.successes + goalData.failures;
                            const gPct = gTotal > 0 ? Math.round((goalData.successes / gTotal) * 100) : 0;

                            return (
                              <div
                                key={goalId}
                                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                              >
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-700">
                                    Goal Assignment: {goalId.slice(0, 8)}…
                                  </p>
                                  {Object.keys(goalData.prompts).length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {Object.entries(goalData.prompts).map(([level, count]) => (
                                        <span
                                          key={level}
                                          className="inline-flex rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                                        >
                                          {level}: {count}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-3 flex items-center gap-3 text-xs text-gray-500">
                                  <span>{gTotal} trials</span>
                                  <span className="text-green-600">{goalData.successes} succ</span>
                                  <span className="text-red-600">{goalData.failures} fail</span>
                                  <div className="h-2 w-16 rounded-full bg-gray-200">
                                    <div
                                      className="h-2 rounded-full bg-primary-500"
                                      style={{ width: `${gPct}%` }}
                                    />
                                  </div>
                                  <span className="font-medium text-gray-900 w-8 text-right">{gPct}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {session.notes && (
                        <p className="mt-3 rounded-md bg-gray-50 p-2 text-xs text-gray-600 whitespace-pre-wrap">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
