import { useRef, useCallback } from 'react';
import useOrders from './useOrders';

interface UseKitchenNotificationsOptions {
  enabled?: boolean;
}

/**
 * Hook that tracks new orders for the Navbar badge.
 * Uses the shared useOrders hook internally.
 */
export default function useKitchenNotifications(
  options?: UseKitchenNotificationsOptions,
) {
  const { enabled = true } = options || {};
  const { newOrdersCount, resetNewOrdersCount } = useOrders(enabled ? 15000 : 0);
  const lastActiveRef = useRef(0);

  const resetCount = useCallback(() => {
    lastActiveRef.current = 0;
    resetNewOrdersCount();
  }, [resetNewOrdersCount]);

  return { newOrdersCount: enabled ? newOrdersCount : 0, resetCount };
}
