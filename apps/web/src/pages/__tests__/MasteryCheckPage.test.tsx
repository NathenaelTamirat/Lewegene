import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { MasteryCheckPage } from '../MasteryCheckPage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockEligibleGoals = [
  {
    goalId: 'g1',
    goalName: 'Identify colors',
    studentId: 's1',
    studentName: 'Alice Johnson',
    independence: 92,
    totalTrials: 50,
    successes: 46,
  },
];

const mockPendingChecks = [
  {
    id: 'mc1',
    goalName: 'Identify colors',
    studentName: 'Alice Johnson',
    status: 'PENDING_APPROVAL',
    independence: 95,
    totalTrials: 50,
    successes: 48,
    primaryTeacher: 'Ms. Smith',
    verifierA: { name: 'Mr. Jones', outcome: 'SUCCESS', notes: null },
    verifierB: { name: 'Ms. Brown', outcome: null, notes: null },
    approver: null,
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
  },
];

const mockCompletedChecks = [
  {
    id: 'mc2',
    goalName: 'Count to 10',
    studentName: 'Bob Smith',
    status: 'MASTERED',
    independence: 100,
    totalTrials: 40,
    successes: 40,
    primaryTeacher: 'Ms. Lee',
    verifierA: { name: 'Mr. Jones', outcome: 'SUCCESS', notes: null },
    verifierB: { name: 'Ms. Brown', outcome: 'SUCCESS', notes: null },
    approver: 'Director Adams',
    approvedAt: '2025-01-15T10:00:00Z',
    rejectedAt: null,
    rejectionReason: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('mastery-eligible')) return Promise.resolve({ data: { data: mockEligibleGoals } });
    if (url.includes('status=PENDING_APPROVAL')) return Promise.resolve({ data: { data: mockPendingChecks } });
    if (url.includes('status=MASTERED')) return Promise.resolve({ data: { data: mockCompletedChecks } });
    return Promise.resolve({ data: { data: [] } });
  });
  mockPost.mockResolvedValue({ data: { success: true } });
});

describe('MasteryCheckPage', () => {
  it('renders page with tabs', async () => {
    renderWithProviders(<MasteryCheckPage />);
    expect(screen.getByText('Goal Mastery Check')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eligible for mastery/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pending verification/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
  });

  it('shows eligible goals when data loads', async () => {
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText(/92% independence/)).toBeInTheDocument();
  });

  it('shows empty state when no eligible goals', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('mastery-eligible')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('status=PENDING_APPROVAL')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('status=MASTERED')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText(/no goals eligible/i)).toBeInTheDocument();
    });
  });

  it('switches to pending tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /pending verification/i }));

    await waitFor(() => {
      expect(screen.getByText('Needs Verification')).toBeInTheDocument();
    });
  });

  it('shows pending checks with review button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /pending verification/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
    });
  });

  it('opens mastery check detail modal on review click', async () => {
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pending verification/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /review/i }));

    await waitFor(() => {
      expect(screen.getByText('Mastery Check Details')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows verification form in modal', async () => {
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pending verification/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /review/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit verification/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows approval form when verifiers are complete', async () => {
    const fullyVerifiedCheck = {
      ...mockPendingChecks[0],
      verifierB: { name: 'Ms. Brown', outcome: 'SUCCESS', notes: null },
    };
    mockGet.mockImplementation((url: string) => {
      if (url.includes('mastery-eligible')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('status=PENDING_APPROVAL')) return Promise.resolve({ data: { data: [fullyVerifiedCheck] } });
      if (url.includes('status=MASTERED')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Goal Mastery Check')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pending verification/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /review/i }));

    await waitFor(() => {
      expect(screen.getByText('Approval Decision')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit decision/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows completed checks tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MasteryCheckPage />);
    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /completed$/i }));

    await waitFor(() => {
      expect(screen.getByText('Count to 10')).toBeInTheDocument();
      expect(screen.getByText('MASTERED')).toBeInTheDocument();
    });
  });
});
