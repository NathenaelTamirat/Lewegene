import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Play, Pause, Plus, Minus, Save, Send, RotateCcw } from 'lucide-react';

type Context = 'SENSORY_TIME' | 'CIRCLE_TIME' | 'PLAY_TIME';

interface ItemState {
  duration: number;
  frequency: number;
  running: boolean;
  elapsedAtStart: number;
}

interface EngagementItem {
  name: string;
  category: string;
}

interface ContextData {
  [itemName: string]: ItemState;
}

interface PreferenceAssessmentProps {
  assessmentId: string;
  studentId: string;
  onSave: (data: any) => void;
  onSubmit: (data: any) => void;
}

const CONTEXTS: { key: Context; label: string }[] = [
  { key: 'SENSORY_TIME', label: 'Sensory Time' },
  { key: 'CIRCLE_TIME', label: 'Circle Time' },
  { key: 'PLAY_TIME', label: 'Play Time' },
];

const ITEMS: EngagementItem[] = [
  { name: 'Bubble Tube', category: 'Visual' },
  { name: 'Fiber Optic', category: 'Visual' },
  { name: 'Light Board', category: 'Visual' },
  { name: 'Projector', category: 'Visual' },
  { name: 'Music Box', category: 'Auditory' },
  { name: 'White Noise', category: 'Auditory' },
  { name: 'Nature Sounds', category: 'Auditory' },
  { name: 'Rhythmic Drums', category: 'Auditory' },
  { name: 'Play-Doh', category: 'Tactile' },
  { name: 'Kinetic Sand', category: 'Tactile' },
  { name: 'Water Table', category: 'Tactile' },
  { name: 'Textured Balls', category: 'Tactile' },
  { name: 'Puzzles', category: 'Toys' },
  { name: 'Building Blocks', category: 'Toys' },
  { name: 'Cars', category: 'Toys' },
  { name: 'Dolls', category: 'Toys' },
  { name: 'Trampoline', category: 'Movement' },
  { name: 'Swing', category: 'Movement' },
  { name: 'Balance Board', category: 'Movement' },
  { name: 'Tunnel', category: 'Movement' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Visual: 'bg-blue-100 text-blue-800',
  Auditory: 'bg-purple-100 text-purple-800',
  Tactile: 'bg-amber-100 text-amber-800',
  Toys: 'bg-green-100 text-green-800',
  Movement: 'bg-rose-100 text-rose-800',
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function computeWeightedScore(duration: number, frequency: number, maxDuration: number, maxFrequency: number): number {
  const normDuration = maxDuration > 0 ? duration / maxDuration : 0;
  const normFrequency = maxFrequency > 0 ? frequency / maxFrequency : 0;
  return Math.round((normDuration * 0.6 + normFrequency * 0.4) * 100);
}

interface ItemRowProps {
  item: EngagementItem;
  state: ItemState;
  maxDuration: number;
  maxFrequency: number;
  onToggleTimer: (name: string) => void;
  onIncrement: (name: string) => void;
  onDecrement: (name: string) => void;
}

function ItemRow({ item, state, maxDuration, maxFrequency, onToggleTimer, onIncrement, onDecrement }: ItemRowProps) {
  const weighted = computeWeightedScore(state.duration, state.frequency, maxDuration, maxFrequency);
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', CATEGORY_COLORS[item.category])}>
            {item.category}
          </span>
          <span className="text-[11px] text-gray-400">
            {formatDuration(state.duration)} · {state.frequency}x · Score {weighted}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onToggleTimer(item.name)}
          className={cn(
            'inline-flex items-center justify-center rounded-md w-8 h-8 text-sm font-medium',
            state.running
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          )}
        >
          {state.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={() => onDecrement(item.name)}
          className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center text-xs font-medium text-gray-700">{state.frequency}</span>
        <button
          onClick={() => onIncrement(item.name)}
          className="inline-flex items-center justify-center rounded-md w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function buildDefaultContext(): ContextData {
  const data: ContextData = {};
  for (const item of ITEMS) {
    data[item.name] = { duration: 0, frequency: 0, running: false, elapsedAtStart: 0 };
  }
  return data;
}

export function PreferenceAssessment({ assessmentId, studentId, onSave, onSubmit }: PreferenceAssessmentProps) {
  const [activeContext, setActiveContext] = useState<Context>('SENSORY_TIME');
  const [contexts, setContexts] = useState<Record<Context, ContextData>>({
    SENSORY_TIME: buildDefaultContext(),
    CIRCLE_TIME: buildDefaultContext(),
    PLAY_TIME: buildDefaultContext(),
  });

  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  const toggleTimer = useCallback((itemName: string) => {
    setContexts(prev => {
      const ctx = { ...prev[activeContext] };
      const item = { ...ctx[itemName] };

      if (item.running) {
        clearInterval(timersRef.current[itemName]);
        delete timersRef.current[itemName];
        item.duration += 1;
        item.running = false;
      } else {
        timersRef.current[itemName] = setInterval(() => {
          setContexts(p => {
            const c = { ...p[activeContext] };
            c[itemName] = { ...c[itemName], duration: c[itemName].duration + 1 };
            return { ...p, [activeContext]: c };
          });
        }, 1000);
        item.running = true;
      }

      ctx[itemName] = item;
      return { ...prev, [activeContext]: ctx };
    });
  }, [activeContext]);

  const increment = useCallback((itemName: string) => {
    setContexts(prev => {
      const ctx = { ...prev[activeContext] };
      ctx[itemName] = { ...ctx[itemName], frequency: ctx[itemName].frequency + 1 };
      return { ...prev, [activeContext]: ctx };
    });
  }, [activeContext]);

  const decrement = useCallback((itemName: string) => {
    setContexts(prev => {
      const ctx = { ...prev[activeContext] };
      ctx[itemName] = { ...ctx[itemName], frequency: Math.max(0, ctx[itemName].frequency - 1) };
      return { ...prev, [activeContext]: ctx };
    });
  }, [activeContext]);

  const currentData = contexts[activeContext];
  const maxDuration = Math.max(1, ...Object.values(currentData).map(d => d.duration));
  const maxFrequency = Math.max(1, ...Object.values(currentData).map(d => d.frequency));

  const sortedItems = [...ITEMS].sort((a, b) => {
    const sa = currentData[a.name];
    const sb = currentData[b.name];
    const scoreA = computeWeightedScore(sa.duration, sa.frequency, maxDuration, maxFrequency);
    const scoreB = computeWeightedScore(sb.duration, sb.frequency, maxDuration, maxFrequency);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (sb.duration !== sa.duration) return sb.duration - sa.duration;
    return sb.frequency - sa.frequency;
  });

  const buildPayload = () => ({
    assessmentId,
    studentId,
    contexts: Object.fromEntries(
      Object.entries(contexts).map(([key, data]) => [
        key,
        Object.entries(data).map(([name, state]) => ({
          name,
          category: ITEMS.find(i => i.name === name)?.category,
          duration: state.duration,
          frequency: state.frequency,
        })),
      ])
    ),
  });

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Preference Assessment: Engagement Tracking</h2>
        <p className="text-xs text-gray-500 mt-0.5">Track item engagement across different contexts</p>
      </div>

      <div className="border-b border-gray-200 px-4 flex gap-1">
        {CONTEXTS.map(ctx => (
          <button
            key={ctx.key}
            onClick={() => setActiveContext(ctx.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeContext === ctx.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {ctx.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto">
        {sortedItems.map(item => (
          <ItemRow
            key={item.name}
            item={item}
            state={currentData[item.name]}
            maxDuration={maxDuration}
            maxFrequency={maxFrequency}
            onToggleTimer={toggleTimer}
            onIncrement={increment}
            onDecrement={decrement}
          />
        ))}
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
