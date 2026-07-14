import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/test-utils';
import { ParentPortalPage } from '../ParentPortalPage';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockChildren = [
  { id: 's1', firstName: 'Alice', lastName: 'Johnson' },
  { id: 's2', firstName: 'Bob', lastName: 'Smith' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/students/parent')) return Promise.resolve({ data: { data: mockChildren } });
    if (url.includes('/progress')) return Promise.resolve({ data: { data: null } });
    if (url.includes('/observations')) return Promise.resolve({ data: { data: [] } });
    if (url.includes('/messages')) return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { data: null } });
  });
  mockPost.mockResolvedValue({ data: { success: true } });
});

describe('ParentPortalPage', () => {
  it('renders parent portal header', async () => {
    renderWithProviders(<ParentPortalPage />);
    await waitFor(() => {
      expect(screen.getByText('Parent Portal')).toBeInTheDocument();
    });
  });

  it('shows child selector when children loaded', async () => {
    renderWithProviders(<ParentPortalPage />);
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('renders overview, progress, observations, messages tabs', async () => {
    renderWithProviders(<ParentPortalPage />);
    await waitFor(() => {
      expect(screen.getByText('Parent Portal')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /child progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home observations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /messages/i })).toBeInTheDocument();
  });

  it('shows empty state when no children', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/students/parent')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });

    renderWithProviders(<ParentPortalPage />);
    await waitFor(() => {
      expect(screen.getByText('Parent Portal')).toBeInTheDocument();
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/students/parent')) return Promise.resolve({ data: { data: mockChildren } });
      if (url.includes('/progress')) return Promise.resolve({ data: { data: null } });
      if (url.includes('/observations')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/messages')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: null } });
    });

    const user = userEvent.setup();
    renderWithProviders(<ParentPortalPage />);

    await waitFor(() => {
      expect(screen.getByText('Parent Portal')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /messages/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Messages').length).toBeGreaterThanOrEqual(2);
    });

    await user.click(screen.getByRole('button', { name: /home observations/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Home Observations').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders overview tab with child progress data', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/students/parent')) return Promise.resolve({ data: { data: mockChildren } });
      if (url.includes('/progress')) return Promise.resolve({
        data: {
          data: {
            studentId: 's1',
            studentName: 'Alice Johnson',
            goals: [
              { name: 'Identify colors', domain: 'Academic', progress: 75, status: 'ACTIVE' },
            ],
            recentSessions: [],
          },
        },
      });
      return Promise.resolve({ data: { data: [] } });
    });

    renderWithProviders(<ParentPortalPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });
});
