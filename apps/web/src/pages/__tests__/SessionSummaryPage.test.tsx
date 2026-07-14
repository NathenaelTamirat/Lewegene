import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { SessionSummaryPage } from '../SessionSummaryPage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockActiveBlock = {
  id: 'block-1',
  name: 'Morning Session',
  startTime: '2025-03-10T09:00:00Z',
  endTime: '2025-03-10T10:30:00Z',
  station: 'STATION_1',
};

const mockSummary = {
  id: 'summary-1',
  station: 'STATION_1',
  startTime: '2025-03-10T09:00:00Z',
  endTime: '2025-03-10T10:30:00Z',
  notes: null,
  status: 'DRAFT',
  teacher: { firstName: 'Jane', lastName: 'Smith' },
  assignments: [
    {
      student: { id: 's1', firstName: 'Alice', lastName: 'Johnson' },
      goals: [
        {
          goal: { name: 'Identify colors', type: 'STANDARD' },
          totalTrials: 10,
          successes: 8,
          independence: 80,
          promptBreakdown: { Independent: 5, Gestural: 3, Full: 2 },
        },
      ],
    },
  ],
  incidents: [
    {
      id: 'inc-1',
      behaviorName: 'Hand flapping',
      category: 'Stereotypy',
      frequency: 3,
      intensity: 'Low',
      antecedent: 'Transition',
      consequence: ' redirection',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({ data: { success: true } });
});

describe('SessionSummaryPage', () => {
  it('renders no active session state', async () => {
    mockGet.mockResolvedValue({ data: { data: null } });
    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('No Active Session')).toBeInTheDocument();
      expect(screen.getByText(/session summary will appear here/i)).toBeInTheDocument();
    });
  });

  it('renders session summary when data loads', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Session Summary')).toBeInTheDocument();
      expect(screen.getByText(/jane smith/i)).toBeInTheDocument();
    });
  });

  it('shows student assignments', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText(/1 goals/)).toBeInTheDocument();
    });
  });

  it('expands student to show goal details', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    const user = userEvent.setup();
    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice Johnson'));

    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('shows behavior incidents', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByText('Hand flapping')).toBeInTheDocument();
      expect(screen.getByText(/behavior incidents/i)).toBeInTheDocument();
    });
  });

  it('has save draft and submit buttons', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit & end session/i })).toBeInTheDocument();
    });
  });

  it('calls save draft API on save click', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('active-block')) return Promise.resolve({ data: { data: mockActiveBlock } });
      if (url.includes('summary')) return Promise.resolve({ data: { data: mockSummary } });
      return Promise.resolve({ data: { data: null } });
    });

    const user = userEvent.setup();
    renderWithProviders(<SessionSummaryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save draft/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/sessions/block-1/draft', { notes: '' });
    });
  });
});
