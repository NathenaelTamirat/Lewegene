import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Settings, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { cn } from '../lib/utils';

type AdminTab = 'abc' | 'prompts' | 'schedule' | 'domains' | 'trialStream';

interface SystemConfig {
  id: string;
  key: string;
  value: unknown;
  category: string;
}

const defaultPrompts = [
  { label: 'Full Physical', color: '#EF4444', order: 1, active: true },
  { label: 'Partial Physical', color: '#F59E0B', order: 2, active: true },
  { label: 'Gesture', color: '#3B82F6', order: 3, active: true },
  { label: 'Verbal', color: '#10B981', order: 4, active: true },
  { label: 'Independent', color: '#8B5CF6', order: 5, active: true },
];

const defaultSchedule = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
  preTherapyDuration: 15,
  station1Duration: 30,
  station2Duration: 30,
  staffToStudentCapacity: 4,
  draftExpiryDays: 90,
};

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('abc');
  const queryClient = useQueryClient();

  const { data: abcConfigs, isLoading: abcLoading } = useQuery<SystemConfig[]>({
    queryKey: ['config', 'abc'],
    queryFn: async () => {
      const res = await api.get('/config/abc');
      return res.data.data;
    },
  });

  const { data: promptConfigs } = useQuery<SystemConfig[]>({
    queryKey: ['config', 'prompts'],
    queryFn: async () => {
      const res = await api.get('/config/prompts');
      return res.data.data;
    },
  });

  const { data: scheduleConfigs } = useQuery<SystemConfig[]>({
    queryKey: ['config', 'schedule'],
    queryFn: async () => {
      const res = await api.get('/config/schedule');
      return res.data.data;
    },
  });

  const { data: domains, isLoading: domainsLoading } = useQuery<Array<{ id: string; name: string; description: string | null; order: number; active: boolean; _count: { goals: number } }>>({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await api.get('/domains');
      return res.data.data;
    },
  });

  const { data: trialStreamConfigs } = useQuery<SystemConfig[]>({
    queryKey: ['config', 'trialStream'],
    queryFn: async () => {
      const res = await api.get('/config/trialStream');
      return res.data.data;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await api.put(`/config/${key}`, { value });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const tabs = [
    { id: 'abc' as const, label: 'ABC Dropdowns' },
    { id: 'prompts' as const, label: 'Prompt Levels' },
    { id: 'schedule' as const, label: 'Session Schedule' },
    { id: 'domains' as const, label: 'Goal Domains' },
    { id: 'trialStream' as const, label: 'Trial Stream' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Administration</h1>
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

      {activeTab === 'abc' && <ABCConfig configs={abcConfigs} isLoading={abcLoading} onSave={(key, value) => updateConfigMutation.mutate({ key, value })} />}
      {activeTab === 'prompts' && <PromptConfig configs={promptConfigs} onSave={(key, value) => updateConfigMutation.mutate({ key, value })} />}
      {activeTab === 'schedule' && <ScheduleConfig configs={scheduleConfigs} onSave={(key, value) => updateConfigMutation.mutate({ key, value })} />}
      {activeTab === 'domains' && <DomainConfig domains={domains} isLoading={domainsLoading} queryClient={queryClient} />}
      {activeTab === 'trialStream' && <TrialStreamConfig configs={trialStreamConfigs} onSave={(key, value) => updateConfigMutation.mutate({ key, value })} />}
    </div>
  );
}

function ABCConfig({ configs, isLoading, onSave }: { configs?: SystemConfig[]; isLoading: boolean; onSave: (key: string, value: unknown) => void }) {
  const [newAntecedent, setNewAntecedent] = useState('');
  const [newBehavior, setNewBehavior] = useState('');
  const [newConsequence, setNewConsequence] = useState('');

  const antecedents = configs?.find(c => c.key === 'abc.antecedents')?.value as string[] || [];
  const behaviors = configs?.find(c => c.key === 'abc.behaviors')?.value as string[] || [];
  const consequences = configs?.find(c => c.key === 'abc.consequences')?.value as string[] || [];

  if (isLoading) return <LoadingSpinner className="h-32" />;

  const handleAdd = (type: 'antecedents' | 'behaviors' | 'consequences', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = type === 'antecedents' ? antecedents : type === 'behaviors' ? behaviors : consequences;
    onSave(`abc.${type}`, [...current, value.trim()]);
    setter('');
  };

  const handleRemove = (type: 'antecedents' | 'behaviors' | 'consequences', index: number) => {
    const current = type === 'antecedents' ? antecedents : type === 'behaviors' ? behaviors : consequences;
    onSave(`abc.${type}`, current.filter((_: string, i: number) => i !== index));
  };

  const sections = [
    { type: 'antecedents' as const, label: 'Antecedents', items: antecedents, value: newAntecedent, setter: setNewAntecedent },
    { type: 'behaviors' as const, label: 'Behaviors', items: behaviors, value: newBehavior, setter: setNewBehavior },
    { type: 'consequences' as const, label: 'Consequences', items: consequences, value: newConsequence, setter: setNewConsequence },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Configure the dropdown options used in ABC (Antecedent-Behavior-Consequence) incident logging.</p>
      {sections.map(s => (
        <div key={s.type} className="rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{s.label}</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={s.value}
              onChange={e => s.setter(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd(s.type, s.value, s.setter)}
              placeholder={`Add ${s.label.toLowerCase()}...`}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={() => handleAdd(s.type, s.value, s.setter)}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {s.items.map((item: string, idx: number) => (
              <div key={idx} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{item}</span>
                </div>
                <button onClick={() => handleRemove(s.type, idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {s.items.length === 0 && <p className="text-sm text-gray-400 italic">No items configured.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptConfig({ configs, onSave }: { configs?: SystemConfig[]; onSave: (key: string, value: unknown) => void }) {
  const stored = configs?.find(c => c.key === 'prompts.levels')?.value as typeof defaultPrompts | undefined;
  const prompts = stored || defaultPrompts;
  const [localPrompts, setLocalPrompts] = useState(prompts);

  const handleUpdate = (index: number, field: string, value: unknown) => {
    const updated = [...localPrompts];
    (updated[index] as Record<string, unknown>)[field] = value;
    setLocalPrompts(updated);
  };

  const handleAdd = () => {
    setLocalPrompts([...localPrompts, { label: '', color: '#6B7280', order: localPrompts.length + 1, active: true }]);
  };

  const handleRemove = (index: number) => {
    setLocalPrompts(localPrompts.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave('prompts.levels', localPrompts);
  };

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Prompt Levels</h3>
        <div className="flex gap-2">
          <button onClick={handleAdd} className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="h-4 w-4" /> Add Level
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Configure prompt level labels, colors, and order for trial logging.</p>
      <div className="space-y-3">
        {localPrompts.map((prompt, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
            <input
              value={prompt.label}
              onChange={e => handleUpdate(idx, 'label', e.target.value)}
              placeholder="Label"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <input
              type="color"
              value={prompt.color}
              onChange={e => handleUpdate(idx, 'color', e.target.value)}
              className="h-10 w-10 rounded-md border border-gray-300 cursor-pointer"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={prompt.active}
                onChange={e => handleUpdate(idx, 'active', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Active
            </label>
            <button onClick={() => handleRemove(idx)} className="text-red-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleConfig({ configs, onSave }: { configs?: SystemConfig[]; onSave: (key: string, value: unknown) => void }) {
  const stored = configs?.find(c => c.key === 'schedule.config')?.value as typeof defaultSchedule | undefined;
  const schedule = stored || defaultSchedule;
  const [local, setLocal] = useState(schedule);

  const handleUpdate = (field: string, value: string | number) => {
    setLocal({ ...local, [field]: value });
  };

  const handleSave = () => {
    onSave('schedule.config', local);
  };

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Session Schedule & Capacity</h3>
        <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Morning Round</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Start Time</label>
              <input type="time" value={local.morningStart} onChange={e => handleUpdate('morningStart', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">End Time</label>
              <input type="time" value={local.morningEnd} onChange={e => handleUpdate('morningEnd', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Afternoon Round</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Start Time</label>
              <input type="time" value={local.afternoonStart} onChange={e => handleUpdate('afternoonStart', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">End Time</label>
              <input type="time" value={local.afternoonEnd} onChange={e => handleUpdate('afternoonEnd', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Station Durations (minutes)</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Pre-Therapy</label>
              <input type="number" value={local.preTherapyDuration} onChange={e => handleUpdate('preTherapyDuration', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">Station 1</label>
              <input type="number" value={local.station1Duration} onChange={e => handleUpdate('station1Duration', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">Station 2</label>
              <input type="number" value={local.station2Duration} onChange={e => handleUpdate('station2Duration', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Capacity & Retention</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Staff-to-Student Capacity</label>
              <input type="number" value={local.staffToStudentCapacity} onChange={e => handleUpdate('staffToStudentCapacity', parseInt(e.target.value) || 1)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">Draft Expiry (days)</label>
              <input type="number" value={local.draftExpiryDays} onChange={e => handleUpdate('draftExpiryDays', parseInt(e.target.value) || 30)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainConfig({ domains, isLoading, queryClient }: { domains?: Array<{ id: string; name: string; description: string | null; order: number; active: boolean; _count: { goals: number } }>; isLoading: boolean; queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient> }) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => api.post('/domains', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['domains'] }); setNewName(''); setNewDesc(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/domains/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Goal Domains</h3>
      <p className="text-sm text-gray-500 mb-4">Manage the domain categories used for goals in the Goal Bank.</p>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Domain name" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        <button onClick={() => newName.trim() && createMutation.mutate({ name: newName.trim(), description: newDesc.trim() || undefined })} disabled={!newName.trim() || createMutation.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {domains?.map(d => (
          <div key={d.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
            <div>
              <span className="text-sm font-medium text-gray-900">{d.name}</span>
              {d.description && <span className="ml-2 text-xs text-gray-500">— {d.description}</span>}
              <span className="ml-2 text-xs text-gray-400">({d._count.goals} goals)</span>
            </div>
            <button onClick={() => { if (window.confirm(`Delete domain "${d.name}"?`)) deleteMutation.mutate(d.id); }} disabled={d._count.goals > 0} className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed" title={d._count.goals > 0 ? 'Cannot delete: has assigned goals' : 'Delete'}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {(!domains || domains.length === 0) && <p className="text-sm text-gray-400 italic">No domains configured.</p>}
      </div>
    </div>
  );
}

const defaultTrialStream = {
  layout: 'horizontal' as 'horizontal' | 'vertical' | 'cardGrid',
  count: 10,
  consecutiveTrialsRequired: 3,
  percentageThreshold: 80,
  autoSuggest: true,
};

function TrialStreamConfig({ configs, onSave }: { configs?: SystemConfig[]; onSave: (key: string, value: unknown) => void }) {
  const stored = configs?.find(c => c.key === 'trialStream.config')?.value as typeof defaultTrialStream | undefined;
  const config = stored || defaultTrialStream;
  const [local, setLocal] = useState(config);

  const handleSave = () => onSave('trialStream.config', local);

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Trial Stream & Mastery Criteria</h3>
        <button onClick={handleSave} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Trial Stream Layout</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Layout</label>
              <select value={local.layout} onChange={e => setLocal({ ...local, layout: e.target.value as typeof local.layout })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="cardGrid">Card Grid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500">Visible Trial Count (3-20)</label>
              <input type="number" min={3} max={20} value={local.count} onChange={e => setLocal({ ...local, count: Math.min(20, Math.max(3, parseInt(e.target.value) || 3)) })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Mastery Criteria</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-500">Consecutive Trials Required</label>
              <input type="number" min={1} value={local.consecutiveTrialsRequired} onChange={e => setLocal({ ...local, consecutiveTrialsRequired: parseInt(e.target.value) || 1 })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-500">Independence % Threshold</label>
              <input type="number" min={0} max={100} value={local.percentageThreshold} onChange={e => setLocal({ ...local, percentageThreshold: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={local.autoSuggest} onChange={e => setLocal({ ...local, autoSuggest: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              Auto-suggest mastery when criteria met
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
