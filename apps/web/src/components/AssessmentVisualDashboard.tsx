import { useState } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';

interface SkillDomainData {
  red: number;
  yellow: number;
  green: number;
  total: number;
}

interface AssessmentData {
  skills?: Record<string, SkillDomainData>;
  behaviorFunctions?: {
    sensory: number;
    escape: number;
    attention: number;
    tangible: number;
  };
  preferences?: Array<{
    name: string;
    duration: number;
    frequency: number;
    score: number;
  }>;
}

interface AssessmentVisualDashboardProps {
  assessmentData: AssessmentData;
}

const DOMAIN_LABELS: Record<string, string> = {
  Communication: 'Communication',
  Social: 'Social',
  Motor: 'Motor',
  Cognitive: 'Cognitive',
  'Self-Help': 'Self-Help',
  Language: 'Language',
};

const DOMAIN_KEYS = ['Communication', 'Social', 'Motor', 'Cognitive', 'Self-Help', 'Language'];

const BEHAVIOR_COLORS = {
  sensory: 'bg-violet-500',
  escape: 'bg-red-500',
  attention: 'bg-amber-500',
  tangible: 'bg-emerald-500',
};

const BEHAVIOR_HEX = {
  sensory: '#8B5CF6',
  escape: '#EF4444',
  attention: '#F59E0B',
  tangible: '#10B981',
};

function getGreenPercentage(d: SkillDomainData): number {
  if (d.total === 0) return 0;
  return Math.round((d.green / d.total) * 100);
}

function SkillsRadarChart({ skills }: { skills: Record<string, SkillDomainData> }) {
  const domains = DOMAIN_KEYS.filter(k => skills[k]);
  const angles = domains.map((_, i) => (360 / domains.length) * i - 90);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Skills Proficiency by Domain</h3>
      <div className="relative h-64 w-64">
        {/* Background circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[100, 75, 50, 25].map(pct => (
            <div
              key={pct}
              className="absolute rounded-full border border-gray-200"
              style={{
                width: `${pct}%`,
                height: `${pct}%`,
              }}
            />
          ))}
        </div>

        {/* Axis lines and labels */}
        {domains.map((domain, i) => {
          const angle = angles[i];
          const rad = (angle * Math.PI) / 180;
          const labelX = 50 + 55 * Math.cos(rad);
          const labelY = 50 + 55 * Math.sin(rad);
          const pct = getGreenPercentage(skills[domain]);

          return (
            <div key={domain}>
              {/* Axis line */}
              <div
                className="absolute top-1/2 left-1/2 h-px bg-gray-200 origin-left"
                style={{
                  width: '48%',
                  transform: `rotate(${angle + 90}deg)`,
                  transformOrigin: '0% 0%',
                  left: '50%',
                  top: '50%',
                }}
              />
              {/* Domain label */}
              <div
                className="absolute text-[10px] font-medium text-gray-700 text-center"
                style={{
                  left: `${labelX}%`,
                  top: `${labelY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {DOMAIN_LABELS[domain] || domain}
              </div>
            </div>
          );
        })}

        {/* Data polygon */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
        >
          {/* Filled area */}
          <polygon
            points={domains.map((domain, i) => {
              const pct = getGreenPercentage(skills[domain]);
              const radius = (pct / 100) * 45;
              const rad = (angles[i] * Math.PI) / 180;
              const x = 50 + radius * Math.cos(rad);
              const y = 50 + radius * Math.sin(rad);
              return `${x},${y}`;
            }).join(' ')}
            className="fill-primary-500/20 stroke-primary-500"
            strokeWidth="1.5"
          />
          {/* Data points */}
          {domains.map((domain, i) => {
            const pct = getGreenPercentage(skills[domain]);
            const radius = (pct / 100) * 45;
            const rad = (angles[i] * Math.PI) / 180;
            const x = 50 + radius * Math.cos(rad);
            const y = 50 + radius * Math.sin(rad);
            return (
              <circle
                key={domain}
                cx={x}
                cy={y}
                r="2"
                className="fill-primary-600"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-500">
        {domains.map(domain => {
          const pct = getGreenPercentage(skills[domain]);
          return (
            <div key={domain} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
              <span className="truncate">{DOMAIN_LABELS[domain] || domain}: {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BehaviorFunctionSummary({ behaviorFunctions }: { behaviorFunctions: { sensory: number; escape: number; attention: number; tangible: number } }) {
  const total = behaviorFunctions.sensory + behaviorFunctions.escape + behaviorFunctions.attention + behaviorFunctions.tangible;

  if (total === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 italic">No behavior function data available.</p>
      </div>
    );
  }

  const segments = [
    { key: 'sensory' as const, label: 'Sensory', value: behaviorFunctions.sensory },
    { key: 'escape' as const, label: 'Escape', value: behaviorFunctions.escape },
    { key: 'attention' as const, label: 'Attention', value: behaviorFunctions.attention },
    { key: 'tangible' as const, label: 'Tangible', value: behaviorFunctions.tangible },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Behavior Function Summary</h3>
      <div className="h-8 w-full flex rounded-full overflow-hidden bg-gray-200">
        {segments.map(seg => {
          const pct = Math.round((seg.value / total) * 100);
          if (pct === 0) return null;
          return (
            <div
              key={seg.key}
              className={cn('h-full transition-all duration-500', BEHAVIOR_COLORS[seg.key])}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${pct}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {segments.map(seg => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.key} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: BEHAVIOR_HEX[seg.key] }}
              />
              <span className="text-gray-600">{seg.label}</span>
              <span className="font-medium text-gray-900">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopPreferencesList({ preferences }: { preferences: Array<{ name: string; duration: number; frequency: number; score: number }> }) {
  const top5 = [...preferences].sort((a, b) => b.score - a.score).slice(0, 5);
  const maxScore = top5.length > 0 ? Math.max(...top5.map(p => p.score)) : 1;

  if (top5.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500 italic">No preference data available.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Top 5 Preferences</h3>
      <div className="space-y-3">
        {top5.map((pref, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-900 truncate">{pref.name}</span>
                <span className="text-xs font-medium text-gray-600 shrink-0 ml-2">{pref.score}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${(pref.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {pref.duration}m · {pref.frequency}x
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssessmentVisualDashboard({ assessmentData }: AssessmentVisualDashboardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasData =
    (assessmentData.skills && Object.keys(assessmentData.skills).length > 0) ||
    (assessmentData.behaviorFunctions &&
      (assessmentData.behaviorFunctions.sensory + assessmentData.behaviorFunctions.escape +
        assessmentData.behaviorFunctions.attention + assessmentData.behaviorFunctions.tangible) > 0) ||
    (assessmentData.preferences && assessmentData.preferences.length > 0);

  if (!hasData) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">Assessment Visual Dashboard</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 p-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {assessmentData.skills && Object.keys(assessmentData.skills).length > 0 && (
              <div className="rounded-lg bg-gray-50 p-4">
                <SkillsRadarChart skills={assessmentData.skills} />
              </div>
            )}

            {assessmentData.behaviorFunctions && (
              <div className="rounded-lg bg-gray-50 p-4 flex items-center">
                <BehaviorFunctionSummary behaviorFunctions={assessmentData.behaviorFunctions} />
              </div>
            )}

            {assessmentData.preferences && assessmentData.preferences.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-4">
                <TopPreferencesList preferences={assessmentData.preferences} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
