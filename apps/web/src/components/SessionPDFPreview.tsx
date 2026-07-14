import { cn } from '../lib/utils';
import { Download, X } from 'lucide-react';

interface SessionData {
  date: string;
  timeRange: string;
  teacher: string;
  station: string;
  goals: Array<{
    goalName: string;
    totalTrials: number;
    successes: number;
    independence: number;
    promptBreakdown: Record<string, number>;
  }>;
  incidents: Array<{
    behaviorName: string;
    category: string;
    frequency: number;
    intensity: string;
  }>;
  notes: string | null;
}

interface SessionPDFPreviewProps {
  data: SessionData;
  onClose: () => void;
}

export function SessionPDFPreview({ data, onClose }: SessionPDFPreviewProps) {
  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Session Summary - ${data.date}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; font-weight: 600; }
          .header p { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .info-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .info-card .label { font-size: 10px; text-transform: uppercase; font-weight: 500; color: #9ca3af; letter-spacing: 0.05em; }
          .info-card .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          .goal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .goal-name { font-size: 14px; font-weight: 500; }
          .goal-stats { display: flex; gap: 16px; font-size: 13px; color: #6b7280; }
          .goal-stats .success { color: #16a34a; }
          .goal-stats .fail { color: #dc2626; }
          .goal-stats .independence { font-weight: 600; color: #2563eb; }
          .prompt-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; background: #f3f4f6; color: #374151; }
          .incident-row { padding: 8px 0; border-bottom: 1px solid #fef3c7; background: #fffbeb; margin: 0 -4px; padding-left: 4px; padding-right: 4px; border-radius: 4px; }
          .incident-row .name { font-weight: 500; font-size: 14px; }
          .incident-row .detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .notes { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 14px; white-space: pre-wrap; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Session Summary</h1>
          <p>${data.teacher} — ${data.station} — ${data.date}</p>
        </div>
        <div class="info-grid">
          <div class="info-card">
            <div class="label">Date</div>
            <div class="value">${data.date}</div>
          </div>
          <div class="info-card">
            <div class="label">Time</div>
            <div class="value">${data.timeRange}</div>
          </div>
          <div class="info-card">
            <div class="label">Teacher</div>
            <div class="value">${data.teacher}</div>
          </div>
          <div class="info-card">
            <div class="label">Station</div>
            <div class="value">${data.station}</div>
          </div>
        </div>
        <div class="section">
          <h2>Student Goals</h2>
          ${data.goals.map(g => `
            <div class="goal-row">
              <div>
                <div class="goal-name">${g.goalName}</div>
                <div style="margin-top: 4px;">
                  ${Object.entries(g.promptBreakdown).map(([level, count]) => `<span class="prompt-badge">${level}: ${count}</span> `).join('')}
                </div>
              </div>
              <div class="goal-stats">
                <span>${g.totalTrials} trials</span>
                <span class="success">${g.successes} success</span>
                <span class="fail">${g.totalTrials - g.successes} fail</span>
                <span class="independence">${g.independence}%</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${data.incidents.length > 0 ? `
          <div class="section">
            <h2>Behavior Incidents</h2>
            ${data.incidents.map(i => `
              <div class="incident-row">
                <div class="name">${i.behaviorName} <span style="font-weight:400; font-size: 12px; color: #9ca3af;">(${i.category})</span></div>
                <div class="detail">Frequency: ${i.frequency} — Intensity: ${i.intensity}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${data.notes ? `
          <div class="section">
            <h2>Teacher Notes</h2>
            <div class="notes">${data.notes}</div>
          </div>
        ` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Session Summary Preview</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="rounded-lg border border-gray-200 p-6 bg-white">
            <div className="border-b-2 border-gray-200 pb-4 mb-6">
              <h1 className="text-xl font-semibold text-gray-900">Session Summary</h1>
              <p className="text-sm text-gray-500 mt-1">{data.teacher} — {data.station} — {data.date}</p>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Date', value: data.date },
                { label: 'Time', value: data.timeRange },
                { label: 'Teacher', value: data.teacher },
                { label: 'Station', value: data.station },
              ].map(item => (
                <div key={item.label} className="rounded-md border border-gray-200 p-3">
                  <p className="text-[10px] uppercase font-medium text-gray-400 tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Student Goals</h3>
              <div className="space-y-3">
                {data.goals.map((goal, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{goal.goalName}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(goal.promptBreakdown).map(([level, count]) => (
                          <span key={level} className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            {level}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 space-y-0.5">
                      <p>{goal.totalTrials} trials</p>
                      <p className="text-green-600">{goal.successes} success</p>
                      <p className="text-red-600">{goal.totalTrials - goal.successes} fail</p>
                      <p className="text-blue-600 font-semibold">{goal.independence}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.incidents.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">Behavior Incidents</h3>
                <div className="space-y-2">
                  {data.incidents.map((incident, idx) => (
                    <div key={idx} className="rounded-md bg-amber-50 p-3">
                      <p className="text-sm font-medium text-gray-900">{incident.behaviorName} <span className="font-normal text-gray-500">({incident.category})</span></p>
                      <p className="text-xs text-gray-500 mt-1">Frequency: {incident.frequency} — Intensity: {incident.intensity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-2">Teacher Notes</h3>
                <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-wrap">{data.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
