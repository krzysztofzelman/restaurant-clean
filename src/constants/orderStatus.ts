import type { OrderStatus } from '../lib/database.types';

/**
 * Wyświetlane etykiety dla statusów zamówień.
 */
export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Oczekujące',
  confirmed: 'Potwierdzone',
  preparing: 'W przygotowaniu',
  ready: 'Gotowe',
  in_transit: 'W drodze',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
};

/**
 * Kolory Bootstrap (bg-*) dla statusów zamówień.
 */
export const statusColors: Record<OrderStatus, string> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'success',
  in_transit: 'dark',
  delivered: 'secondary',
  cancelled: 'danger',
};

/**
 * Kolejny status w domyślnym przepływie zamówienia.
 * Tylko dla sekwencji: pending → confirmed → preparing → ready.
 */
export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
};
