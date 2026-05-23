import { useEffect, useState, useRef, useCallback } from 'react';
import { getAllOrders } from '../services/api';
import type { OrderWithRelations } from '../lib/database.types';

interface UseOrdersResult {
  orders: OrderWithRelations[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  newOrdersCount: number;
  resetNewOrdersCount: () => void;
}

/**
 * Współdzielony hook do pobierania zamówień z opcjonalnym pollingiem.
 *
 * @param intervalMs - interval polling w ms (0 = brak pollingu)
 */
export default function useOrders(intervalMs: number = 0): UseOrdersResult {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const lastCountRef = useRef(0);
  const initializedRef = useRef(false);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = await getAllOrders();
      setOrders(data);

      // Zliczanie nowych zamówień (dla powiadomień)
      if (initializedRef.current) {
        const currentCount = data.length;
        if (currentCount > lastCountRef.current) {
          const diff = currentCount - lastCountRef.current;
          setNewOrdersCount((prev) => prev + diff);
        }
      }
      lastCountRef.current = data.length;
      initializedRef.current = true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const resetNewOrdersCount = useCallback(() => {
    setNewOrdersCount(0);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, refresh]);

  return { orders, loading, error, refresh, newOrdersCount, resetNewOrdersCount };
}
