import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock with vi.hoisted so it's available before hoisted vi.mock
const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}));

vi.mock('../lib/apiClient', () => ({
  apiRequest: mockApiRequest,
}));

// Now import functions that use apiRequest
import {
  getAllReservations,
  createReservation,
  updateReservationStatus,
  getMenuItems,
  getAllMenuItems,
  getUserProfile,
} from './api';

describe('api.ts — reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllReservations', () => {
    it('should fetch reservations without filters', async () => {
      const mockData = [
        {
          id: '1',
          user_id: 'user-1',
          date: '2025-01-15',
          time: '18:00',
          guests: 2,
          status: 'pending',
          notes: null,
          created_at: '2025-01-10T12:00:00Z',
          user: null,
        },
      ];
      mockApiRequest.mockResolvedValue(mockData);

      const result = await getAllReservations();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/reservations');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should apply date and status filters when provided', async () => {
      mockApiRequest.mockResolvedValue([]);

      await getAllReservations({
        startDate: '2025-01-01',
        endDate: '2025-03-01',
        status: 'confirmed',
      });

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/reservations?start_date=2025-01-01&end_date=2025-03-01&status=confirmed',
      );
    });

    it('should throw on error', async () => {
      mockApiRequest.mockRejectedValue(new Error('DB error'));

      await expect(getAllReservations()).rejects.toThrow('DB error');
    });
  });

  describe('createReservation', () => {
    it('should POST reservation data to backend (user_id from JWT, not in body)', async () => {
      const mockData = {
        id: '3',
        user_id: 'user-1',
        date: '2025-06-15',
        time: '18:00',
        guests: 4,
        status: 'pending',
        notes: null,
        created_at: '2025-06-10T12:00:00Z',
      };
      mockApiRequest.mockResolvedValue(mockData);

      const result = await createReservation({
        user_id: 'user-1',
        date: '2025-06-15',
        time: '18:00',
        guests: 4,
        notes: null,
      });

      // user_id is NOT in the body — backend gets user from JWT
      expect(mockApiRequest).toHaveBeenCalledWith('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          date: '2025-06-15',
          time: '18:00',
          guests: 4,
          notes: null,
        }),
      });
      expect(result).toMatchObject({
        id: '3',
        user_id: 'user-1',
        date: '2025-06-15',
        status: 'pending',
      });
    });

    it('should throw on insert error', async () => {
      mockApiRequest.mockRejectedValue(new Error('Insert failed'));

      await expect(
        createReservation({
          user_id: 'user-1',
          date: '2025-06-15',
          time: '18:00',
          guests: 2,
          notes: null,
        }),
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('updateReservationStatus', () => {
    it('should PUT updated status', async () => {
      const mockData = {
        id: '1',
        user_id: 'user-1',
        date: '2025-06-15',
        time: '18:00',
        guests: 2,
        status: 'confirmed',
        notes: null,
        created_at: '2025-01-10T12:00:00Z',
      };
      mockApiRequest.mockResolvedValue(mockData);

      const result = await updateReservationStatus('1', 'confirmed');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/reservations/1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'confirmed' }),
      });
      expect(result).toMatchObject({
        id: '1',
        status: 'confirmed',
      });
    });

    it('should throw on update error', async () => {
      mockApiRequest.mockRejectedValue(new Error('Update failed'));

      await expect(
        updateReservationStatus('1', 'cancelled'),
      ).rejects.toThrow('Update failed');
    });
  });
});

describe('api.ts — menu items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMenuItems should fetch available items', async () => {
    const mockData = [
      { id: '1', name: 'Pizza', is_available: true, category: 'Dania główne' },
    ];
    mockApiRequest.mockResolvedValue(mockData);

    const result = await getMenuItems();

    expect(mockApiRequest).toHaveBeenCalledWith('/api/menu?available_only=true');
    expect(result).toHaveLength(1);
  });

  it('getAllMenuItems should fetch all items', async () => {
    const mockData = [
      { id: '1', name: 'Pizza', is_available: false, category: 'Dania główne' },
      { id: '2', name: 'Pasta', is_available: true, category: 'Dania główne' },
    ];
    mockApiRequest.mockResolvedValue(mockData);

    const result = await getAllMenuItems();

    expect(mockApiRequest).toHaveBeenCalledWith('/api/menu?available_only=false');
    expect(result).toHaveLength(2);
  });
});

describe('api.ts — user profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUserProfile should fetch from /api/auth/me', async () => {
    const mockApiData = {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    };
    mockApiRequest.mockResolvedValue(mockApiData);

    const result = await getUserProfile('user-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/me');
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
      is_active: true,
    });
  });
});
