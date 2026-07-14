import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { UserPlus, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

type Step = 'info' | 'guardian' | 'program' | 'review';

export function EnrollmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('info');
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    diagnosis: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    programType: 'REGULAR' as 'REGULAR' | 'PULLED_OUT',
    therapyGroup: 'BASIC_THERAPY' as 'BASIC_THERAPY' | 'FUNCTIONAL_LIVING_SKILLS',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return api.post('/students', {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      });
    },
    onSuccess: () => {
      navigate('/students');
    },
  });

  const steps: { id: Step; label: string }[] = [
    { id: 'info', label: 'Student Info' },
    { id: 'guardian', label: 'Guardian Info' },
    { id: 'program', label: 'Program' },
    { id: 'review', label: 'Review' },
  ];

  const currentIdx = steps.findIndex(s => s.id === step);

  const canProceed = () => {
    switch (step) {
      case 'info': return form.firstName && form.lastName && form.dateOfBirth;
      case 'guardian': return true;
      case 'program': return true;
      case 'review': return true;
    }
  };

  const age = form.dateOfBirth
    ? Math.floor((Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0;

  const ageWarning =
    (form.therapyGroup === 'BASIC_THERAPY' && age > 0 && (age < 3 || age > 12)) ||
    (form.therapyGroup === 'FUNCTIONAL_LIVING_SKILLS' && age > 0 && (age < 13 || age > 19));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Enroll New Student</h1>
      </div>

      <div className="flex items-center mb-8">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              idx < currentIdx ? 'bg-green-500 text-white' :
              idx === currentIdx ? 'bg-primary-600 text-white' :
              'bg-gray-200 text-gray-500'
            )}>
              {idx < currentIdx ? <CheckCircle className="h-4 w-4" /> : idx + 1}
            </div>
            <span className={cn('ml-2 text-sm font-medium', idx === currentIdx ? 'text-gray-900' : 'text-gray-400')}>
              {s.label}
            </span>
            {idx < steps.length - 1 && <ArrowRight className="mx-3 h-4 w-4 text-gray-300" />}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white shadow p-6">
        {step === 'info' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Student Information</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input value={form.middleName} onChange={e => setForm({ ...form, middleName: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                {age > 0 && <p className="mt-1 text-xs text-gray-500">Age: {age}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                <input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        )}

        {step === 'guardian' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Guardian Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Guardian Name</label>
              <input value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input value={form.guardianPhone} onChange={e => setForm({ ...form, guardianPhone: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={form.guardianEmail} onChange={e => setForm({ ...form, guardianEmail: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
            </div>
          </div>
        )}

        {step === 'program' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Program & Therapy Group</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Type</label>
              <div className="flex gap-3">
                {[
                  { value: 'REGULAR', label: 'Regular' },
                  { value: 'PULLED_OUT', label: 'Pulled Out' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, programType: opt.value as typeof form.programType })}
                    className={cn(
                      'flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium',
                      form.programType === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Therapy Group</label>
              <div className="flex gap-3">
                {[
                  { value: 'BASIC_THERAPY', label: 'Basic Therapy', ages: '3-12' },
                  { value: 'FUNCTIONAL_LIVING_SKILLS', label: 'Functional Living Skills', ages: '13-19' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, therapyGroup: opt.value as typeof form.therapyGroup })}
                    className={cn(
                      'flex-1 rounded-md border-2 px-4 py-3 text-sm font-medium text-left',
                      form.therapyGroup === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="text-xs opacity-60">Ages {opt.ages}</span>
                  </button>
                ))}
              </div>
              {ageWarning && (
                <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-700">
                  Warning: Age {age} may not be appropriate for {form.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy (ages 3-12)' : 'Functional Living Skills (ages 13-19)'}.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Review & Confirm</h2>
            <div className="rounded-md bg-gray-50 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="font-medium">{form.firstName} {form.middleName} {form.lastName}</span></div>
                <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{form.dateOfBirth || '—'}</span> (Age {age})</div>
                <div><span className="text-gray-500">Diagnosis:</span> <span className="font-medium">{form.diagnosis || '—'}</span></div>
                <div><span className="text-gray-500">Guardian:</span> <span className="font-medium">{form.guardianName || '—'}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{form.guardianPhone || '—'}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="font-medium">{form.guardianEmail || '—'}</span></div>
                <div><span className="text-gray-500">Program:</span> <span className="font-medium">{form.programType === 'REGULAR' ? 'Regular' : 'Pulled Out'}</span></div>
                <div><span className="text-gray-500">Group:</span> <span className="font-medium">{form.therapyGroup === 'BASIC_THERAPY' ? 'Basic Therapy' : 'Functional Living Skills'}</span></div>
              </div>
            </div>
            {ageWarning && (
              <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">
                Age/Group mismatch detected. The student will be enrolled anyway.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              const idx = steps.findIndex(s => s.id === step);
              if (idx > 0) setStep(steps[idx - 1].id);
            }}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step === 'review' ? (
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {createMutation.isPending ? 'Enrolling...' : 'Confirm & Enroll'}
            </button>
          ) : (
            <button
              onClick={() => {
                const idx = steps.findIndex(s => s.id === step);
                if (idx < steps.length - 1) setStep(steps[idx + 1].id);
              }}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
