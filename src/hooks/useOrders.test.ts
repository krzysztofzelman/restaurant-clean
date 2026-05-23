import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useOrders from './useOrders';

const mockOrders = [
  {
    id: '1',
    user_id: 'user-1',
    status: 'pending',
    total_amount: 100,
    payment_status: 'unpaid',
    created_at: '2025-01-01T12:00:00Z',
    delivery_status: 'pending',
    delivery_address: null,
    notes: null,
    courier_id: null,
    order_items: [],
  },
  {
    id: '2',
    user_id: 'user-1',
    status: 'preparing',
    total_amount: 50,
    payment_status: 'paid',
    created_at: '2025-01-01T13:00:00Z',
    delivery_status: 'pending',
    delivery_address: null,
    notes: null,
    courier_id: null,
    order_items: [],
  },
];

// Mock getAllOrders
vi.mock('../services/api', () => ({
  getAllOrders: vi.fn(),
}));

async function mockGetAllOrders() {
  const mod = await import('../services/api');
  return mod.getAllOrders as unknown as ReturnType<typeof vi.fn>;
}

describe('useOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch orders on mount and return them', async () => {
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockResolvedValue(mockOrders);

    const { result } = renderHook(() => useOrders(0));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.orders).toEqual(mockOrders);
    expect(result.current.error).toBe('');
  });

  it('should handle fetch error', async () => {
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrders(0));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('should not poll when intervalMs is 0', async () => {
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockResolvedValue(mockOrders);

    renderHook(() => useOrders(0));

    await waitFor(() => {
      expect(getAllOrders).toHaveBeenCalledTimes(1);
    });

    getAllOrders.mockClear();

    // No more calls after initial
    await new Promise((r) => setTimeout(r, 50));
    expect(getAllOrders).not.toHaveBeenCalled();
  });

  it('should poll when intervalMs > 0', async () => {
    vi.useFakeTimers();
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockResolvedValue(mockOrders);

    renderHook(() => useOrders(5000));

    // Initial fetch
    await vi.advanceTimersByTimeAsync(10);
    expect(getAllOrders).toHaveBeenCalledTimes(1);

    // After 5s — should poll again
    getAllOrders.mockClear();
    await vi.advanceTimersByTimeAsync(5000);
    expect(getAllOrders).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should track new orders count', async () => {
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockResolvedValue(mockOrders);

    const { result } = renderHook(() => useOrders(0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newOrdersCount).toBe(0);

    // Simulate new order appearing (one more item)
    const newOrders = [
      ...mockOrders,
      {
        id: '3',
        user_id: 'user-1',
        status: 'pending',
        total_amount: 75,
        payment_status: 'unpaid',
        created_at: '2025-01-01T14:00:00Z',
        delivery_status: 'pending',
        delivery_address: null,
        notes: null,
        courier_id: null,
        order_items: [],
      },
    ];
    getAllOrders.mockResolvedValue(newOrders);

    // Call refresh manually — wrap in act to flush React state updates
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.newOrdersCount).toBe(1));
  });

  it('should reset new orders count', async () => {
    const getAllOrders = await mockGetAllOrders();
    getAllOrders.mockResolvedValue(mockOrders);

    const { result } = renderHook(() => useOrders(0));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Add a new order
    const newOrders = [
      ...mockOrders,
      {
        id: '3',
        user_id: 'user-1',
        status: 'pending',
        total_amount: 75,
        payment_status: 'unpaid',
        created_at: '2025-01-01T14:00:00Z',
        delivery_status: 'pending',
        delivery_address: null,
        notes: null,
        courier_id: null,
        order_items: [],
      },
    ];
    getAllOrders.mockResolvedValue(newOrders);
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.newOrdersCount).toBe(1));

    // Reset
    act(() => {
      result.current.resetNewOrdersCount();
    });
    expect(result.current.newOrdersCount).toBe(0);
  });
});
