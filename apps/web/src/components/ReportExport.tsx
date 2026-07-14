import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Download, ChevronDown } from 'lucide-react';

type ExportFormat = 'csv';

interface ReportExportProps {
  activeTab: string;
  dateFrom?: string;
  dateTo?: string;
  studentFilter?: string;
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = String(value ?? '');
    }
  }
  return result;
}

function arrayToCsv(data: Array<Record<string, unknown>>): string {
  if (data.length === 0) return '';
  const flatData = data.map(row => flattenObject(row));
  const headers = Array.from(new Set(flatData.flatMap(row => Object.keys(row))));
  const csvRows = [
    headers.join(','),
    ...flatData.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(',')
    ),
  ];
  return csvRows.join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function foundationToRows(data: Record<string, unknown>): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  rows.push({ metric: 'Total Students', value: data.totalStudents });
  rows.push({ metric: 'Active Students', value: data.activeStudents });
  rows.push({ metric: 'Mastered This Month', value: data.masteredThisMonth });
  rows.push({ metric: 'Recent Incidents (30d)', value: data.recentIncidents });
  rows.push({ metric: 'Active Teachers', value: data.activeTeachers });

  if (Array.isArray(data.programDistribution)) {
    rows.push({ metric: '', value: '' });
    rows.push({ metric: '--- Program Distribution ---', value: '' });
    for (const item of data.programDistribution as Array<{ programType: string; _count: number }>) {
      rows.push({ metric: item.programType, count: item._count });
    }
  }

  if (Array.isArray(data.therapyGroupDistribution)) {
    rows.push({ metric: '', value: '' });
    rows.push({ metric: '--- Therapy Group Distribution ---', value: '' });
    for (const item of data.therapyGroupDistribution as Array<{ therapyGroup: string; _count: number }>) {
      rows.push({ metric: item.therapyGroup, count: item._count });
    }
  }

  return rows;
}

export function ReportExport({ activeTab, dateFrom, dateTo, studentFilter }: ReportExportProps) {
  const [open, setOpen] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ['session-reports-export', dateFrom, dateTo, studentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      if (studentFilter) params.set('studentId', studentFilter);
      const res = await api.get(`/reports/session-reports?${params.toString()}`);
      return res.data;
    },
    enabled: activeTab === 'sessions',
  });

  const { data: progressData } = useQuery({
    queryKey: ['student-progress-export', studentFilter],
    queryFn: async () => {
      const res = await api.get(`/reports/student-progress/${studentFilter || 'all'}`);
      return res.data.data;
    },
    enabled: activeTab === 'progress' && !!studentFilter,
  });

  const { data: overviewData } = useQuery({
    queryKey: ['foundation-overview-export'],
    queryFn: async () => {
      const res = await api.get('/reports/foundation-overview');
      return res.data.data;
    },
    enabled: activeTab === 'overview',
  });

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    let csv = '';
    let filename = '';

    if (activeTab === 'sessions' && sessionsData?.data?.length > 0) {
      csv = arrayToCsv(sessionsData.data);
      filename = `session-reports-${timestamp}.csv`;
    } else if (activeTab === 'progress' && progressData) {
      csv = arrayToCsv([progressData]);
      filename = `student-progress-${studentFilter}-${timestamp}.csv`;
    } else if (activeTab === 'overview' && overviewData) {
      csv = arrayToCsv(foundationToRows(overviewData));
      filename = `foundation-overview-${timestamp}.csv`;
    } else {
      return;
    }

    downloadCsv(csv, filename);
    setOpen(false);
  };

  const hasData =
    (activeTab === 'sessions' && sessionsData?.data?.length > 0) ||
    (activeTab === 'progress' && progressData) ||
    (activeTab === 'overview' && overviewData);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={!hasData}
        className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="h-4 w-4" /> Export <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 text-gray-400" />
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
