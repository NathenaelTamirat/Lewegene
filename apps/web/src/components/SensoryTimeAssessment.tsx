import { useState } from 'react';
import { cn } from '../lib/utils';
import { Save, Send } from 'lucide-react';

interface ActivityEntry {
  code: string;
  name: string;
  engagement: string;
  response: string;
  remarks: string;
}

interface SensoryTimeAssessmentProps {
  assessmentId: string;
  studentId: string;
  onSave: (data: any) => void;
  onSubmit: (data: any) => void;
}

const ENGAGEMENT_LEVELS = ['Independent', 'Partial Prompt', 'Full Physical Prompt', 'N/A'] as const;
const RESPONSE_TYPES = ['Enjoyed', 'Neutral', 'Refused', 'Not Observed'] as const;

const ENGAGEMENT_COLORS: Record<string, string> = {
  Independent: 'bg-green-100 text-green-800',
  'Partial Prompt': 'bg-amber-100 text-amber-800',
  'Full Physical Prompt': 'bg-red-100 text-red-800',
  'N/A': 'bg-gray-100 text-gray-500',
};

const RESPONSE_COLORS: Record<string, string> = {
  Enjoyed: 'bg-green-100 text-green-800',
  Neutral: 'bg-blue-100 text-blue-800',
  Refused: 'bg-red-100 text-red-800',
  'Not Observed': 'bg-gray-100 text-gray-500',
};

const DEFAULT_ACTIVITIES: Omit<ActivityEntry, 'engagement' | 'response' | 'remarks'>[] = [
  { code: 'SEN-001', name: 'Bubble Tube Watching' },
  { code: 'SEN-002', name: 'Fiber Optic Light Play' },
  { code: 'SEN-003', name: 'Sand Table Exploration' },
  { code: 'SEN-004', name: 'Water Play Station' },
  { code: 'SEN-005', name: 'Play-Doh Manipulation' },
  { code: 'SEN-006', name: 'Kinetic Sand Molding' },
  { code: 'SEN-007', name: 'Textured Ball Rolling' },
  { code: 'SEN-008', name: 'Music Box Listening' },
  { code: 'SEN-009', name: 'Rhythm Drum Playing' },
  { code: 'SEN-010', name: 'Balance Board Standing' },
  { code: 'SEN-011', name: 'Trampoline Jumping' },
  { code: 'SEN-012', name: 'Tunnel Crawling' },
];

function buildDefaults(): ActivityEntry[] {
  return DEFAULT_ACTIVITIES.map(a => ({
    ...a,
    engagement: '',
    response: '',
    remarks: '',
  }));
}

export function SensoryTimeAssessment({ assessmentId, studentId, onSave, onSubmit }: SensoryTimeAssessmentProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>(buildDefaults);

  const updateField = (index: number, field: keyof ActivityEntry, value: string) => {
    setActivities(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const engagementCounts = ENGAGEMENT_LEVELS.reduce((acc, level) => {
    acc[level] = activities.filter(a => a.engagement === level).length;
    return acc;
  }, {} as Record<string, number>);

  const responseCounts = RESPONSE_TYPES.reduce((acc, type) => {
    acc[type] = activities.filter(a => a.response === type).length;
    return acc;
  }, {} as Record<string, number>);

  const buildPayload = () => ({
    assessmentId,
    studentId,
    activities: activities.map(a => ({
      code: a.code,
      name: a.name,
      engagement: a.engagement || null,
      response: a.response || null,
      remarks: a.remarks || null,
    })),
  });

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Sensory Time Engagement Assessment</h2>
        <p className="text-xs text-gray-500 mt-0.5">Record engagement levels and responses for each sensory activity</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Engagement Level</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Response</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activities.map((activity, idx) => (
              <tr key={activity.code} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5">
                  <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-600">
                    {activity.code}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{activity.name}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={activity.engagement}
                    onChange={e => updateField(idx, 'engagement', e.target.value)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
                      activity.engagement
                        ? ENGAGEMENT_COLORS[activity.engagement]
                        : 'border-gray-300 text-gray-500 bg-white'
                    )}
                  >
                    <option value="">Select...</option>
                    {ENGAGEMENT_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={activity.response}
                    onChange={e => updateField(idx, 'response', e.target.value)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
                      activity.response
                        ? RESPONSE_COLORS[activity.response]
                        : 'border-gray-300 text-gray-500 bg-white'
                    )}
                  >
                    <option value="">Select...</option>
                    {RESPONSE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={activity.remarks}
                    onChange={e => updateField(idx, 'remarks', e.target.value)}
                    placeholder="Optional..."
                    className="w-40 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 px-4 py-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">By Engagement Level</p>
            <div className="space-y-1.5">
              {ENGAGEMENT_LEVELS.map(level => (
                <div key={level} className="flex items-center justify-between text-xs">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', ENGAGEMENT_COLORS[level])}>
                    {level}
                  </span>
                  <span className="font-medium text-gray-700">{engagementCounts[level]}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">By Response Type</p>
            <div className="space-y-1.5">
              {RESPONSE_TYPES.map(type => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', RESPONSE_COLORS[type])}>
                    {type}
                  </span>
                  <span className="font-medium text-gray-700">{responseCounts[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-3 flex gap-3">
        <button
          onClick={() => onSave(buildPayload())}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Save className="h-4 w-4" /> Save Draft
        </button>
        <button
          onClick={() => onSubmit(buildPayload())}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Send className="h-4 w-4" /> Submit
        </button>
      </div>
    </div>
  );
}
