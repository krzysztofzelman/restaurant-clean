import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllReservations,
  createReservation,
  updateReservationStatus,
  getMenuItems,
  getAllMenuItems,
  getUserProfile,
} from './api';

// Build a simple chain mock for Supabase queries
// Each method returns the chain object itself
// The chain is also a thenable, so `await chain` resolves to expectedResult
function createChainMock(expectedResult: { data: unknown; error: unknown }) {
  const terminalPromise = expectedResult.error
    ? Promise.reject(expectedResult.error)
    : Promise.resolve(expectedResult);

  const chain: Record<string, vi.Mock | Promise<unknown>> & {
    then?: Promise<unknown>['then'];
    catch?: Promise<unknown>['catch'];
  } = {};

  const methods = [
    'select', 'insert', 'update', 'delete',
    'order', 'eq', 'or', 'single',
    'range', 'limit', 'gte', 'lte', 'in',
  ];

  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }

  // Make chain thenable so `await chain` resolves/rejects
  chain.then = terminalPromise.then.bind(terminalPromise);
  chain.catch = terminalPromise.catch.bind(terminalPromise);

  return chain;
}

// Mock Supabase client
vi.mock('../lib/supabaseClient', () => {
  const mod = { supabase: { from: vi.fn() } };
  return mod;
});

async function getSupabaseFrom() {
  const mod = await import('../lib/supabaseClient');
  return mod.supabase.from as unknown as ReturnType<typeof vi.fn>;
}

describe('api.ts — reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllReservations', () => {
    it('should fetch reservations without filters', async () => {
      const mockData = [{ id: '1', date: '2025-01-15', status: 'pending' }];
      const chain = createChainMock({ data: mockData, error: null });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

      const result = await getAllReservations();

      expect(supabaseFrom).toHaveBeenCalledWith('rezerwacje');
      expect(result).toEqual(mockData);
    });

    it('should apply date and status filters when provided', async () => {
      const mockData = [{ id: '2', date: '2025-02-01', status: 'confirmed' }];
      const chain = createChainMock({ data: mockData, error: null });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

      const result = await getAllReservations({
        startDate: '2025-01-01',
        endDate: '2025-03-01',
        status: 'confirmed',
      });

      expect(chain.gte).toHaveBeenCalledWith('date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('date', '2025-03-01');
      expect(chain.eq).toHaveBeenCalledWith('status', 'confirmed');
      expect(result).toEqual(mockData);
    });

    it('should throw on error', async () => {
      const chain = createChainMock({ data: null, error: new Error('DB error') });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

      await expect(getAllReservations()).rejects.toThrow('DB error');
    });
  });

  describe('createReservation', () => {
    it('should insert reservation with pending status', async () => {
      const mockInserted = {
        id: '3',
        user_id: 'user-1',
        date: '2025-06-15',
        time: '18:00',
        guests: 4,
        status: 'pending',
        notes: null,
        created_at: '2025-06-10T12:00:00Z',
      };
      const chain = createChainMock({ data: mockInserted, error: null });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

      const result = await createReservation({
        user_id: 'user-1',
        date: '2025-06-15',
        time: '18:00',
        guests: 4,
        notes: null,
      });

      expect(supabaseFrom).toHaveBeenCalledWith('rezerwacje');
      expect(chain.insert).toHaveBeenCalledWith([
        {
          user_id: 'user-1',
          date: '2025-06-15',
          time: '18:00',
          guests: 4,
          notes: null,
          status: 'pending',
        },
      ]);
      expect(result).toEqual(mockInserted);
    });

    it('should throw on insert error', async () => {
      const chain = createChainMock({ data: null, error: new Error('Insert failed') });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

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
    it('should update status to confirmed', async () => {
      const mockUpdated = { id: '1', status: 'confirmed' };
      const chain = createChainMock({ data: mockUpdated, error: null });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

      const result = await updateReservationStatus('1', 'confirmed');

      expect(chain.update).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(chain.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockUpdated);
    });

    it('should throw on update error', async () => {
      const chain = createChainMock({ data: null, error: new Error('Update failed') });
      const supabaseFrom = await getSupabaseFrom();
      supabaseFrom.mockReturnValue(chain);

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
    const mockData = [{ id: '1', name: 'Pizza', is_available: true, category: 'Dania główne' }];
    const chain = createChainMock({ data: mockData, error: null });
    const supabaseFrom = await getSupabaseFrom();
    supabaseFrom.mockReturnValue(chain);

    const result = await getMenuItems();

    expect(chain.eq).toHaveBeenCalledWith('is_available', true);
    expect(result).toEqual(mockData);
  });

  it('getAllMenuItems should fetch all items', async () => {
    const mockData = [
      { id: '1', name: 'Pizza', is_available: false, category: 'Dania główne' },
      { id: '2', name: 'Pasta', is_available: true, category: 'Dania główne' },
    ];
    const chain = createChainMock({ data: mockData, error: null });
    const supabaseFrom = await getSupabaseFrom();
    supabaseFrom.mockReturnValue(chain);

    const result = await getAllMenuItems();

    expect(result).toEqual(mockData);
    expect(result).toHaveLength(2);
  });
});

describe('api.ts — user profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUserProfile should fetch a single profile', async () => {
    const mockProfile = {
      id: 'user-1',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
    };
    const chain = createChainMock({ data: mockProfile, error: null });
    const supabaseFrom = await getSupabaseFrom();
    supabaseFrom.mockReturnValue(chain);

    const result = await getUserProfile('user-1');

    expect(result).toEqual(mockProfile);
  });
});
