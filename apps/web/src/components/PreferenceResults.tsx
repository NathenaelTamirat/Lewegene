import { useState } from 'react';
import { cn } from '../lib/utils';
import { MessageSquare, Plus, GripVertical } from 'lucide-react';

interface RankingItem {
  name: string;
  category: string;
  duration: number;
  frequency: number;
  notes?: string;
  isCustom?: boolean;
}

interface PreferenceResultsProps {
  rankings: RankingItem[];
  onUpdate: (rankings: RankingItem[]) => void;
}

const CATEGORIES = ['Visual', 'Auditory', 'Tactile', 'Toys', 'Movement'];

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

function getRankedItems(items: RankingItem[]): (RankingItem & { rank: number; weightedScore: number })[] {
  const maxDuration = Math.max(1, ...items.map(i => i.duration));
  const maxFrequency = Math.max(1, ...items.map(i => i.frequency));
  return items
    .map(item => ({
      ...item,
      rank: 0,
      weightedScore: computeWeightedScore(item.duration, item.frequency, maxDuration, maxFrequency),
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

export function PreferenceResults({ rankings, onUpdate }: PreferenceResultsProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);

  const ranked = getRankedItems(rankings);

  const updateNotes = (index: number, notes: string) => {
    const updated = [...rankings];
    updated[index] = { ...updated[index], notes };
    onUpdate(updated);
  };

  const addCustomItem = () => {
    if (!newItemName.trim()) return;
    onUpdate([
      ...rankings,
      { name: newItemName.trim(), category: newItemCategory, duration: 0, frequency: 0, isCustom: true },
    ]);
    setNewItemName('');
    setNewItemCategory(CATEGORIES[0]);
    setShowAddForm(false);
  };

  const getOriginalIndex = (rank: number, name: string): number => {
    return rankings.findIndex(r => r.name === name);
  };

  return (
    <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Ranked Preference Results</h2>
        <p className="text-xs text-gray-500 mt-0.5">Items ranked by weighted score (60% duration, 40% frequency)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-12">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Frequency</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ranked.map(item => {
              const origIdx = getOriginalIndex(item.rank, item.name);
              return (
                <tr key={item.name} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-500 font-medium">{item.rank}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {item.isCustom && (
                        <span className="inline-flex rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          Custom
                        </span>
                      )}
                      <span className={cn('font-medium text-gray-900', item.isCustom && 'italic')}>
                        {item.name}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{item.notes}</p>
                    )}
                    {editingNotes === origIdx && (
                      <div className="mt-2">
                        <textarea
                          autoFocus
                          value={item.notes || ''}
                          onChange={e => updateNotes(origIdx, e.target.value)}
                          onBlur={() => setEditingNotes(null)}
                          placeholder="Add notes..."
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-800')}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700 font-mono text-xs">{formatDuration(item.duration)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 font-mono text-xs">{item.frequency}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={cn(
                      'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                      item.weightedScore >= 75 ? 'bg-green-100 text-green-800'
                        : item.weightedScore >= 40 ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {item.weightedScore}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setEditingNotes(editingNotes === origIdx ? null : origIdx)}
                      className={cn(
                        'rounded-md p-1.5 transition-colors',
                        editingNotes === origIdx ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        {showAddForm ? (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
              <input
                autoFocus
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="Enter item name"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addCustomItem}
              disabled={!newItemName.trim()}
              className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewItemName(''); }}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" /> Add Custom Item
          </button>
        )}
      </div>
    </div>
  );
}
