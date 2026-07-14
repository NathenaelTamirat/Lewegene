import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { ChartsPage } from '../ChartsPage';

const mockGet = vi.fn();

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
  },
}));

const mockStudents = [
  { id: 's1', firstName: 'Alice', lastName: 'Johnson' },
  { id: 's2', firstName: 'Bob', lastName: 'Smith' },
];

const mockProgress = {
  studentId: 's1',
  studentName: 'Alice Johnson',
  goals: [
    { name: 'Identify colors', domain: 'Academic', progress: 75, trials: 50, successes: 38 },
    { name: 'Count to 10', domain: 'Math', progress: 90, trials: 40, successes: 36 },
  ],
  sessionCount: 20,
  avgIndependence: 82,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/students?')) return Promise.resolve({ data: { data: mockStudents } });
    if (url.includes('/reports/student-progress/')) return Promise.resolve({ data: { data: mockProgress } });
    if (url.includes('/reports/incident-trends')) return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { data: {} } });
  });
});

describe('ChartsPage', () => {
  it('renders student selector', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows chart type tabs', async () => {
    renderWithProviders(<ChartsPage />);
    expect(screen.getByRole('button', { name: /goal progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trial distribution/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /incident trends/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assessment summary/i })).toBeInTheDocument();
  });

  it('renders empty state when no student selected', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByText('Select a Student')).toBeInTheDocument();
    });
  });

  it('shows export button', async () => {
    renderWithProviders(<ChartsPage />);
    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument();
  });

  it('renders goal progress bars when student selected', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });

    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
      expect(screen.getByText('Count to 10')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  it('switches to trial distribution chart', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });

    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /trial distribution/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Trial Distribution').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to incidents chart', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });

    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /incident trends/i }));

    await waitFor(() => {
      expect(screen.getByText('Behavior Incident Trends')).toBeInTheDocument();
    });
  });

  it('switches to assessment summary chart', async () => {
    renderWithProviders(<ChartsPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's1' } });

    await waitFor(() => {
      expect(screen.getByText('Identify colors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /assessment summary/i }));

    await waitFor(() => {
      expect(screen.getByText('Assessment Summary by Domain')).toBeInTheDocument();
    });
  });
});
