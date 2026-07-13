import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MessageSquare, Send, Inbox, MailOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  content: string;
  subject: string | null;
  sentAt: string;
  isRead: boolean;
  sender: { id: string; firstName: string; lastName: string };
  student: { id: string; firstName: string; lastName: string } | null;
}

export function MessagesPage() {
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ recipientId: '', studentId: '', subject: '', content: '' });

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const res = await api.get('/messages/inbox');
      return res.data.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return api.post('/messages', {
        recipientId: data.recipientId || undefined,
        studentId: data.studentId || undefined,
        subject: data.subject || undefined,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setComposing(false);
      setForm({ recipientId: '', studentId: '', subject: '', content: '' });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/messages/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const unreadCount = messages?.filter(m => !m.isRead).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setComposing(true)}
          className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Send className="h-4 w-4" /> Compose
        </button>
      </div>

      {composing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">New Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipient User ID (optional)</label>
                <input value={form.recipientId} onChange={e => setForm({ ...form, recipientId: e.target.value })} placeholder="Leave blank for broadcast" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Student ID (optional)</label>
                <input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setComposing(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => sendMutation.mutate(form)}
                  disabled={!form.content || sendMutation.isPending}
                  className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : !messages || messages.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <Inbox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Messages</h3>
          <p className="mt-1 text-sm text-gray-500">Your inbox is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'rounded-lg bg-white p-4 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow',
                msg.isRead ? 'border-gray-200' : 'border-primary-500'
              )}
              onClick={() => { if (!msg.isRead) markReadMutation.mutate(msg.id); }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!msg.isRead && <div className="h-2 w-2 rounded-full bg-primary-500" />}
                    <span className="font-medium text-gray-900">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </span>
                    {msg.student && (
                      <span className="text-xs text-gray-400">
                        re: {msg.student.firstName} {msg.student.lastName}
                      </span>
                    )}
                  </div>
                  {msg.subject && <p className="text-sm font-medium text-gray-700 mt-1">{msg.subject}</p>}
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-gray-400">{new Date(msg.sentAt).toLocaleDateString()}</span>
                  {msg.isRead ? (
                    <MailOpen className="h-4 w-4 text-gray-300" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
