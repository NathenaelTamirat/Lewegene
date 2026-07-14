import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { cn } from '../lib/utils';
import { ArrowRight, Users } from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

interface PipelineColumn {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  statuses: string[];
}

const columns: PipelineColumn[] = [
  {
    id: 'assessment',
    label: 'In Assessment',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    statuses: ['IN_ASSESSMENT'],
  },
  {
    id: 'assessment_complete',
    label: 'Assessment Complete',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    statuses: ['ASSESSMENT_COMPLETE'],
  },
  {
    id: 'ready_iup',
    label: 'Ready for IUP',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    statuses: ['READY_FOR_IUP'],
  },
  {
    id: 'active_iup',
    label: 'Active IUP',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    statuses: ['ACTIVE_IUP', 'ACTIVE'],
  },
];

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function AssessmentPipeline() {
  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students-pipeline'],
    queryFn: async () => {
      const res = await api.get('/students?limit=100');
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;

  const grouped: Record<string, Student[]> = {};
  for (const col of columns) {
    grouped[col.id] = [];
  }

  students?.forEach(student => {
    for (const col of columns) {
      if (col.statuses.includes(student.status)) {
        grouped[col.id].push(student);
        break;
      }
    }
  });

  const totalStudents = students?.length || 0;

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900">Assessment Pipeline</h3>
        <span className="text-xs text-gray-500 ml-auto">{totalStudents} students total</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {columns.map(col => {
          const items = grouped[col.id];
          return (
            <div key={col.id} className={cn('rounded-lg border p-3', col.bgColor, col.borderColor)}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={cn('text-xs font-semibold uppercase tracking-wide', col.color)}>{col.label}</h4>
                <span className={cn('inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold', col.color, 'bg-white/80')}>
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No students</p>
                ) : (
                  items.map(student => (
                    <div key={student.id} className="rounded-md bg-white p-2.5 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 shrink-0">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] text-gray-500">{daysSince(student.createdAt)} days in stage</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 mt-3 text-gray-300">
        {columns.map((col, idx) => (
          <div key={col.id} className="flex items-center gap-2">
            {idx > 0 && <ArrowRight className="h-4 w-4" />}
          </div>
        ))}
      </div>
    </div>
  );
}
