import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReservationList from './ReservationList';
import type { ReservationWithProfile } from '../../lib/database.types';

// Mock ToastContext
vi.mock('../../context/ToastContext', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// Mock api
vi.mock('../../services/api', () => ({
  updateReservationStatus: vi.fn(),
}));

const mockReservations: ReservationWithProfile[] = [
  {
    id: '1',
    user_id: 'user-1',
    date: '2025-06-15',
    time: '18:00',
    guests: 4,
    status: 'pending',
    notes: null,
    created_at: '2025-06-10T10:00:00Z',
    profiles: { email: 'test@example.com', full_name: 'Test User' },
  },
  {
    id: '2',
    user_id: 'user-2',
    date: '2025-06-16',
    time: '19:00',
    guests: 2,
    status: 'confirmed',
    notes: 'Alergia na orzechy',
    created_at: '2025-06-11T12:00:00Z',
    profiles: { email: 'user2@example.com', full_name: null },
  },
  {
    id: '3',
    user_id: 'user-3',
    date: '2025-06-14',
    time: '17:00',
    guests: 6,
    status: 'cancelled',
    notes: null,
    created_at: '2025-06-09T08:00:00Z',
    profiles: { email: 'user3@example.com', full_name: 'User Three' },
  },
];

const defaultProps = {
  reservations: mockReservations,
  loading: false,
  startDate: '',
  endDate: '',
  statusFilter: '',
  sortOrder: 'desc' as const,
  onStartDateChange: vi.fn(),
  onEndDateChange: vi.fn(),
  onStatusFilterChange: vi.fn(),
  onSortOrderChange: vi.fn(),
  onSelectReservation: vi.fn(),
  onRefresh: vi.fn(),
};

describe('ReservationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading spinner when loading', () => {
    render(<ReservationList {...defaultProps} loading={true} />);
    expect(document.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('should display empty message when no reservations', () => {
    render(<ReservationList {...defaultProps} reservations={[]} />);
    expect(screen.getByText('Brak rezerwacji')).toBeInTheDocument();
    expect(
      screen.getByText('Spróbuj zmienić kryteria filtrowania'),
    ).toBeInTheDocument();
  });

  it('should render reservation emails', () => {
    render(<ReservationList {...defaultProps} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('user3@example.com')).toBeInTheDocument();
  });

  it('should display correct status badges (duplicated in mobile+desktop views)', () => {
    render(<ReservationList {...defaultProps} />);

    // Both desktop table and mobile cards render status badges,
    // so we use getAllByText
    const pendingBadges = screen.getAllByText('Oczekująca');
    expect(pendingBadges.length).toBe(2); // 1 desktop + 1 mobile

    const confirmedBadges = screen.getAllByText('Potwierdzona');
    expect(confirmedBadges.length).toBe(2); // 1 desktop + 1 mobile

    const cancelledBadges = screen.getAllByText('Anulowana');
    expect(cancelledBadges.length).toBe(2); // 1 desktop + 1 mobile
  });

  it('should call onSelectReservation when a desktop row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ReservationList {...defaultProps} onSelectReservation={onSelect} />,
    );

    // Click on an email link in the desktop table
    const email = screen.getByText('test@example.com');
    fireEvent.click(email);

    expect(onSelect).toHaveBeenCalled();
  });

  it('should render confirm button for pending reservations (x2: desktop+mobile)', () => {
    render(<ReservationList {...defaultProps} />);

    const confirmButtons = document.querySelectorAll(
      'button[title="Potwierdź"]',
    );
    // One pending reservation renders in both desktop and mobile views
    expect(confirmButtons.length).toBe(2);
  });

  it('should render cancel button only for pending+confirmed (x2: desktop+mobile)', () => {
    render(<ReservationList {...defaultProps} />);

    const cancelButtons = document.querySelectorAll('button[title="Anuluj"]');
    // Two reservations (pending + confirmed) × 2 views (desktop + mobile) = 4
    expect(cancelButtons.length).toBe(4);
  });

  it('should call onSortOrderChange when sort button is clicked', () => {
    const onSortChange = vi.fn();
    render(
      <ReservationList {...defaultProps} onSortOrderChange={onSortChange} />,
    );

    const sortButton = screen.getByTitle('Sortuj od najstarszych');
    fireEvent.click(sortButton);
    expect(onSortChange).toHaveBeenCalled();
  });

  it('should call onStatusFilterChange when status select changes', () => {
    const onFilterChange = vi.fn();
    render(
      <ReservationList
        {...defaultProps}
        onStatusFilterChange={onFilterChange}
      />,
    );

    const select = screen.getByDisplayValue('Wszystkie');
    fireEvent.change(select, { target: { value: 'pending' } });
    expect(onFilterChange).toHaveBeenCalledWith('pending');
  });

  it('should call onRefresh after confirming a reservation', async () => {
    const { updateReservationStatus } = await import('../../services/api');
    vi.mocked(updateReservationStatus).mockResolvedValue({
      id: '1',
      user_id: 'user-1',
      date: '2025-06-15',
      time: '18:00',
      guests: 4,
      status: 'confirmed',
      notes: null,
      created_at: '2025-06-10T10:00:00Z',
    } as ReservationWithProfile);

    const onRefresh = vi.fn();
    render(
      <ReservationList {...defaultProps} onRefresh={onRefresh} />,
    );

    // Click first confirm button (desktop view)
    const confirmButtons = document.querySelectorAll(
      'button[title="Potwierdź"]',
    );
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(updateReservationStatus).toHaveBeenCalledWith('1', 'confirmed');
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
