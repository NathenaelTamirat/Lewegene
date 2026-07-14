import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { Home, BookOpen, MessageSquare, Plus, Send, Clock } from 'lucide-react';

type ParentTab = 'overview' | 'progress' | 'observations' | 'messages';

interface ChildProgress {
  studentId: string;
  studentName: string;
  goals: Array<{
    name: string;
    domain: string;
    progress: number;
    status: string;
  }>;
  recentSessions: Array<{
    date: string;
    trials: number;
    independence: number;
  }>;
}

interface HomeObservation {
  id: string;
  date: string;
  behavior: string;
  notes: string;
  submittedBy: string;
}

interface Message {
  id: string;
  content: string;
  sender: { firstName: string; lastName: string; role: string };
  createdAt: string;
  read: boolean;
}

export function ParentPortalPage() {
  const [activeTab, setActiveTab] = useState<ParentTab>('overview');
  const queryClient = useQueryClient();

  const { data: children, isLoading: childrenLoading } = useQuery<Array<{ id: string; firstName: string; lastName: string }>>({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const res = await api.get('/students/parent');
      return res.data.data;
    },
  });

  const [selectedChildId, setSelectedChildId] = useState('');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Home },
    { id: 'progress' as const, label: 'Child Progress', icon: BookOpen },
    { id: 'observations' as const, label: 'Home Observations', icon: Clock },
    { id: 'messages' as const, label: 'Messages', icon: MessageSquare },
  ];

  if (childrenLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Parent Portal</h1>
        </div>
        {children && children.length > 0 && (
          <select
            value={selectedChildId || children[0]?.id}
            onChange={e => setSelectedChildId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
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
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && <ParentOverview childId={selectedChildId || children?.[0]?.id} />}
      {activeTab === 'progress' && <ChildProgressView childId={selectedChildId || children?.[0]?.id} />}
      {activeTab === 'observations' && <HomeObservations childId={selectedChildId || children?.[0]?.id} queryClient={queryClient} />}
      {activeTab === 'messages' && <ParentMessages />}
    </div>
  );
}

function ParentOverview({ childId }: { childId?: string }) {
  const { data: progress, isLoading } = useQuery<ChildProgress>({
    queryKey: ['child-progress', childId],
    queryFn: async () => {
      const res = await api.get(`/students/${childId}/progress`);
      return res.data.data;
    },
    enabled: !!childId,
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;
  if (!progress) return <p className="text-sm text-gray-500">No data available.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{progress.studentName}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-md bg-primary-50 p-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{progress.goals.length}</p>
            <p className="text-xs text-gray-500">Active Goals</p>
          </div>
          <div className="rounded-md bg-green-50 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {progress.goals.filter(g => g.status === 'MASTERED').length}
            </p>
            <p className="text-xs text-gray-500">Mastered</p>
          </div>
          <div className="rounded-md bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {progress.goals.length > 0 ? Math.round(progress.goals.reduce((sum, g) => sum + g.progress, 0) / progress.goals.length) : 0}%
            </p>
            <p className="text-xs text-gray-500">Avg Progress</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Goal Progress</h3>
        <div className="space-y-3">
          {progress.goals.map((goal, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{goal.name}</span>
                  <span className="text-gray-500">{goal.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-primary-500" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-16 text-right">{goal.domain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChildProgressView({ childId }: { childId?: string }) {
  const { data: progress, isLoading } = useQuery<ChildProgress>({
    queryKey: ['child-progress', childId],
    queryFn: async () => {
      const res = await api.get(`/students/${childId}/progress`);
      return res.data.data;
    },
    enabled: !!childId,
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;
  if (!progress) return <p className="text-sm text-gray-500">No progress data available.</p>;

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Goals & Achievements</h2>
      <div className="space-y-4">
        {progress.goals.map((goal, idx) => (
          <div key={idx} className="rounded-md border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">{goal.name}</p>
                <p className="text-xs text-gray-500">{goal.domain}</p>
              </div>
              <span className={cn(
                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                goal.status === 'MASTERED' ? 'bg-green-100 text-green-800' :
                goal.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              )}>
                {goal.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-primary-500" style={{ width: `${goal.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeObservations({ childId, queryClient }: { childId?: string; queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient> }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ behavior: '', notes: '' });

  const { data: observations, isLoading } = useQuery<HomeObservation[]>({
    queryKey: ['home-observations', childId],
    queryFn: async () => {
      const res = await api.get(`/students/${childId}/observations`);
      return res.data.data;
    },
    enabled: !!childId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => api.post(`/students/${childId}/observations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-observations', childId] });
      setShowForm(false);
      setForm({ behavior: '', notes: '' });
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Home Observations</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> New Observation
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">New Home Observation</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Behavior Observed</label>
              <input value={form.behavior} onChange={e => setForm({ ...form, behavior: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="e.g., Used words to request snack" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Describe the observation..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.behavior || createMutation.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                <Send className="h-4 w-4 inline mr-1" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow">
        {(!observations || observations.length === 0) ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No observations recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {observations.map(obs => (
              <div key={obs.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{obs.behavior}</p>
                  <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600">{obs.notes}</p>
                <p className="text-xs text-gray-400 mt-1">By {obs.submittedBy}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ParentMessages() {
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['parent-messages'],
    queryFn: async () => {
      const res = await api.get('/messages');
      return res.data.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => api.post('/messages', { content, recipientRole: 'TEACHER' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-messages'] });
      setComposing(false);
      setNewMessage('');
    },
  });

  if (isLoading) return <LoadingSpinner className="h-32" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Messages</h2>
        <button onClick={() => setComposing(true)} className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> New Message
        </button>
      </div>

      {composing && (
        <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
          <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3} className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Type your message..." />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setComposing(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => sendMutation.mutate(newMessage)} disabled={!newMessage.trim() || sendMutation.isPending} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              <Send className="h-4 w-4 inline mr-1" /> Send
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow divide-y divide-gray-200">
        {(!messages || messages.length === 0) ? (
          <div className="p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No messages yet.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={cn('p-4', !msg.read && 'bg-primary-50')}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {msg.sender.firstName} {msg.sender.lastName}
                  <span className="ml-2 text-xs text-gray-400">({msg.sender.role})</span>
                </p>
                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600">{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
