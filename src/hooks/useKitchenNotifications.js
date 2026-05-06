import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllOrders } from '../services/api';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);       // A5
    oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
    oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.2); // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio API not available — silently ignore
  }
}

function sendPushNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {
    // Notification not supported — silently ignore
  }
}

export default function useKitchenNotifications() {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const prevPendingIdsRef = useRef(null); // null = not initialized yet
  const intervalRef = useRef(null);

  const checkForNewOrders = useCallback(async () => {
    try {
      const orders = await getAllOrders();
      const currentPending = orders.filter((o) => o.status === 'pending');
      const currentIds = new Set(currentPending.map((o) => o.id));

      // First run: just seed the ref, don't notify
      if (prevPendingIdsRef.current === null) {
        prevPendingIdsRef.current = currentIds;
        return;
      }

      // Subsequent runs: detect truly new orders
      const prevIds = prevPendingIdsRef.current;
      const newIds = [...currentIds].filter((id) => !prevIds.has(id));

      if (newIds.length > 0) {
        setNewOrdersCount((prev) => prev + newIds.length);

        newIds.forEach((id) => {
          playNotificationSound();
          const shortId = id.slice(0, 8);
          sendPushNotification(
            'Nowe zamówienie!',
            `Zamówienie #${shortId} czeka na realizację`
          );
        });
      }

      prevPendingIdsRef.current = currentIds;
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  const resetCount = useCallback(() => {
    setNewOrdersCount(0);
  }, []);

  useEffect(() => {
    // Initial check
    checkForNewOrders();

    // Poll every 10s
    intervalRef.current = setInterval(checkForNewOrders, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForNewOrders]);

  return { newOrdersCount, resetCount };
}
