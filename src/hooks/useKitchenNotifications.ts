import { useEffect, useState, useRef, useCallback } from 'react';
import { getAllOrders } from '../services/api';

interface UseKitchenNotificationsOptions {
  enabled?: boolean;
}

/**
 * Hook that polls order status from Supabase every 15 seconds.
 * When `enabled` is true (default), tracks the count of non-final orders and
 * exposes it as `newOrdersCount` (used by Navbar to show a badge).
 * Also returns `resetCount` to reset the tracked count (used by KitchenPage).
 */
export default function useKitchenNotifications(
  options?: UseKitchenNotificationsOptions,
) {
  const { enabled = true } = options || {};
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const lastCountRef = useRef(0);
  const initializedRef = useRef(false);

  const resetCount = useCallback(() => {
    lastCountRef.current = 0;
    setNewOrdersCount(0);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const checkOrders = async () => {
      try {
        const orders = await getAllOrders();
        const activeOrders = orders.filter(
          (o) =>
            o.status !== 'delivered' && o.status !== 'cancelled',
        );
        const currentCount = activeOrders.length;

        if (initializedRef.current) {
          const diff = currentCount - lastCountRef.current;
          if (diff > 0) {
            setNewOrdersCount(prev => prev + diff);
          }
        } else {
          initializedRef.current = true;
        }

        lastCountRef.current = currentCount;
      } catch {
        // Silently fail – polling will retry
      }
    };

    // Check immediately, then every 15 seconds
    checkOrders();
    const interval = setInterval(checkOrders, 15000);
    return () => clearInterval(interval);
  }, [enabled]);

  return { newOrdersCount, resetCount };
}
