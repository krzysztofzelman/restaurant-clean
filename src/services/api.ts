import { apiRequest } from '../lib/apiClient';
import type {
  MenuItem,
  Order,
  OrderWithRelations,
  Profile,
  IngredientWithBatches,
  IngredientBatch,
  MenuItemIngredientWithIngredient,
  Conversation,
  Reservation,
  ReservationWithProfile,
} from '../lib/database.types';

/* ──────────────── Menu items ──────────────── */

export async function getMenuItems(): Promise<MenuItem[]> {
  return apiRequest<MenuItem[]>('/api/menu?available_only=true');
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  return apiRequest<MenuItem[]>('/api/menu?available_only=false');
}

export async function toggleMenuItemAvailability(
  id: string,
  isAvailable: boolean,
): Promise<MenuItem> {
  return apiRequest<MenuItem>(`/api/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_available: isAvailable }),
  });
}

export async function addMenuItem(
  item: Omit<MenuItem, 'id' | 'created_at'>,
): Promise<MenuItem> {
  return apiRequest<MenuItem>('/api/menu', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function updateMenuItem(
  id: string,
  updates: Partial<Omit<MenuItem, 'id' | 'created_at'>>,
): Promise<MenuItem> {
  return apiRequest<MenuItem>(`/api/menu/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiRequest<void>(`/api/menu/${id}`, { method: 'DELETE' });
}

/* ──────────────── Menu image upload ──────────────── */

export async function uploadMenuImage(
  file: File,
  menuItemId: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('menu_item_id', menuItemId);

  const result = await apiRequest<{ url: string }>('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return result.url;
}

/* ──────────────── Orders ──────────────── */

interface CreateOrderParams {
  userId: string;
  items: { id: string; quantity: number; price: number }[];
  totalAmount: number;
  deliveryAddress?: string;
  notes?: string;
}

/** Map backend OrderResponse → frontend Order shape */
function mapOrder(raw: Record<string, unknown>): Order {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    status: raw.status as string,
    delivery_status: raw.delivery_status as string,
    total_amount: raw.total_amount as number,
    payment_status: raw.payment_status as string,
    delivery_address: (raw.delivery_address as string) ?? null,
    notes: (raw.notes as string) ?? null,
    courier_id: (raw.courier_id as string) ?? null,
    created_at: raw.created_at as string,
  };
}

/** Map backend OrderResponse → frontend OrderWithRelations */
function mapOrderWithRelations(raw: Record<string, unknown>): OrderWithRelations {
  const order = mapOrder(raw);
  const rawItems = (raw.items as Record<string, unknown>[]) || [];

  const orderItems = rawItems.map((item) => {
    const menuItemRaw = item.menu_item as Record<string, unknown> | null;
    return {
      id: item.id as string,
      order_id: order.id,
      menu_item_id: item.menu_item_id as string,
      quantity: item.quantity as number,
      unit_price: item.unit_price as number,
      subtotal: item.subtotal as number,
      menu_item: menuItemRaw
        ? {
            id: menuItemRaw.id as string,
            name: menuItemRaw.name as string,
            description: (menuItemRaw.description as string) ?? null,
            price: menuItemRaw.price as number,
            category: (menuItemRaw.category as string) ?? '',
            is_available: (menuItemRaw.is_available as boolean) ?? true,
            image_url: (menuItemRaw.image_url as string) ?? null,
            created_at: (menuItemRaw.created_at as string) ?? order.created_at,
          }
        : {
            id: item.menu_item_id as string,
            name: 'Unknown',
            description: null,
            price: item.unit_price as number,
            category: '',
            is_available: true,
            image_url: null,
            created_at: order.created_at,
          },
    };
  });

  const userRaw = raw.user as Record<string, unknown> | null;
  return {
    ...order,
    order_items: orderItems,
    profiles: userRaw
      ? { full_name: userRaw.full_name as string, email: userRaw.email as string }
      : null,
  };
}

export async function createOrder({
  userId: _userId,
  items,
  totalAmount: _totalAmount,
  deliveryAddress,
  notes,
}: CreateOrderParams): Promise<Order> {
  const body = {
    items: items.map((i) => ({
      menu_item_id: i.id,
      quantity: i.quantity,
    })),
    delivery_address: deliveryAddress || null,
    notes: notes || null,
  };
  const raw = await apiRequest<Record<string, unknown>>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapOrder(raw);
}

export async function getMyOrders(
  _userId: string,
): Promise<OrderWithRelations[]> {
  const raw = await apiRequest<Record<string, unknown>[]>('/api/orders');
  return raw.map(mapOrderWithRelations);
}

export async function getAllOrders(): Promise<OrderWithRelations[]> {
  const raw = await apiRequest<Record<string, unknown>[]>('/api/orders');
  return raw.map(mapOrderWithRelations);
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<Order> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/orders/${orderId}/status`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  );
  return mapOrder(raw);
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
): Promise<Order> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/orders/${orderId}/payment-status`,
    {
      method: 'PUT',
      body: JSON.stringify({ payment_status: paymentStatus }),
    },
  );
  return mapOrder(raw);
}

/* ──────────────── Courier / Delivery ──────────────── */

export async function getCourierOrders(): Promise<OrderWithRelations[]> {
  // Courier role on backend automatically filters to ready/in_transit
  const raw = await apiRequest<Record<string, unknown>[]>('/api/orders');
  return raw.map(mapOrderWithRelations);
}

export async function getCourierHistory(
  courierId: string,
): Promise<OrderWithRelations[]> {
  const raw = await apiRequest<Record<string, unknown>[]>(
    `/api/orders?courier_id=${courierId}&status=delivered`,
  );
  return raw.map(mapOrderWithRelations);
}

export async function updateDeliveryStatus(
  orderId: string,
  status: string,
  courierId?: string,
): Promise<void> {
  const body: Record<string, unknown> = { status };
  await apiRequest(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/* ──────────────── Stripe payment ──────────────── */

export async function createPaymentIntent(
  orderId: string,
  _amount: number,
): Promise<{ clientSecret: string }> {
  const result = await apiRequest<{ client_secret: string }>(
    `/api/payment/create-intent?order_id=${orderId}`,
    { method: 'POST' },
  );
  return { clientSecret: result.client_secret };
}

/* ──────────────── User profile ──────────────── */

export async function getUserProfile(userId: string): Promise<Profile> {
  const raw = await apiRequest<Record<string, unknown>>('/api/auth/me');
  return {
    id: raw.id as string,
    email: (raw.email as string) ?? null,
    full_name: (raw.full_name as string) ?? null,
    role: raw.role as Profile['role'],
    is_active: raw.is_active as boolean,
    created_at: raw.created_at as string,
  };
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<Profile> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/auth/users/${userId}/role`,
    {
      method: 'PUT',
      body: JSON.stringify({ role }),
    },
  );
  return {
    id: raw.id as string,
    email: (raw.email as string) ?? null,
    full_name: (raw.full_name as string) ?? null,
    role: raw.role as Profile['role'],
    is_active: raw.is_active as boolean,
    created_at: raw.created_at as string,
  };
}

export async function getAllProfiles(): Promise<Profile[]> {
  const raw = await apiRequest<Record<string, unknown>[]>('/api/auth/users');
  return raw.map((u) => ({
    id: u.id as string,
    email: (u.email as string) ?? null,
    full_name: (u.full_name as string) ?? null,
    role: u.role as Profile['role'],
    is_active: u.is_active as boolean,
    created_at: u.created_at as string,
  }));
}

/* ──────────────── Warehouse / Ingredients ──────────────── */

export async function getIngredients(): Promise<
  (IngredientWithBatches & { total_stock: number })[]
> {
  const raw = await apiRequest<
    (Record<string, unknown> & { id: string; name: string })[]
  >('/api/warehouse/ingredients');
  // Fetch batches per ingredient for stock calculation
  const result = await Promise.all(
    raw.map(async (ing) => {
      try {
        const batches = await apiRequest<Record<string, unknown>[]>(
          `/api/warehouse/batches?ingredient_id=${ing.id}`,
        );
        const totalStock = batches.reduce(
          (sum, b) => sum + Number(b.quantity || 0),
          0,
        );
        return {
          id: ing.id as string,
          name: ing.name as string,
          unit: ing.unit as string,
          min_stock: ing.min_stock as number,
          category: (ing.category as string) ?? null,
          created_at: ing.created_at as string,
          total_stock: totalStock,
          ingredient_batches: batches.map((b) => ({
            quantity: Number(b.quantity || 0),
          })),
        } as IngredientWithBatches & { total_stock: number };
      } catch {
        return {
          id: ing.id as string,
          name: ing.name as string,
          unit: ing.unit as string,
          min_stock: ing.min_stock as number,
          category: (ing.category as string) ?? null,
          created_at: ing.created_at as string,
          total_stock: 0,
          ingredient_batches: [],
        } as IngredientWithBatches & { total_stock: number };
      }
    }),
  );
  return result;
}

export async function getIngredientBatches(
  ingredientId: string,
): Promise<IngredientBatch[]> {
  const raw = await apiRequest<Record<string, unknown>[]>(
    `/api/warehouse/batches?ingredient_id=${ingredientId}`,
  );
  return raw.map((b) => ({
    id: b.id as string,
    ingredient_id: b.ingredient_id as string,
    quantity: b.quantity as number,
    cost_per_unit: (b.cost_per_unit as number) ?? null,
    received_at: b.received_at as string,
    expires_at: (b.expires_at as string) ?? null,
    created_at: b.created_at as string,
  }));
}

export async function addIngredient(
  data: Omit<
    IngredientWithBatches,
    'id' | 'created_at' | 'total_stock' | 'ingredient_batches'
  >,
): Promise<IngredientWithBatches> {
  const raw = await apiRequest<Record<string, unknown>>(
    '/api/warehouse/ingredients',
    { method: 'POST', body: JSON.stringify(data) },
  );
  return {
    id: raw.id as string,
    name: raw.name as string,
    unit: raw.unit as string,
    min_stock: raw.min_stock as number,
    category: (raw.category as string) ?? null,
    created_at: raw.created_at as string,
    ingredient_batches: [],
    total_stock: 0,
  } as IngredientWithBatches;
}

export async function addBatch(
  data: Omit<IngredientBatch, 'id' | 'created_at' | 'received_at'>,
): Promise<IngredientBatch> {
  const raw = await apiRequest<Record<string, unknown>>(
    '/api/warehouse/batches',
    { method: 'POST', body: JSON.stringify(data) },
  );
  return {
    id: raw.id as string,
    ingredient_id: raw.ingredient_id as string,
    quantity: raw.quantity as number,
    cost_per_unit: (raw.cost_per_unit as number) ?? null,
    received_at: raw.received_at as string,
    expires_at: (raw.expires_at as string) ?? null,
    created_at: raw.created_at as string,
  };
}

/* ──────────────── Menu item ingredients (recipes) ──────────────── */

export async function getMenuItemIngredients(
  menuItemId: string,
): Promise<MenuItemIngredientWithIngredient[]> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/warehouse/recipes/${menuItemId}`,
  );
  const ingredients = raw.ingredients as Record<string, unknown>[];
  return ingredients.map((i) => ({
    id: (i.id as string) ?? '',
    menu_item_id: menuItemId,
    ingredient_id: i.ingredient_id as string,
    quantity_needed: i.quantity_needed as number,
    ingredient: {
      id: i.ingredient_id as string,
      name: (i.ingredient_name as string) ?? 'Unknown',
      unit: (i.unit as string) ?? '',
      min_stock: (i.min_stock as number) ?? 0,
      category: (i.category as string) ?? null,
      created_at: '',
    },
  }));
}

export async function addMenuItemIngredient(
  menuItemId: string,
  ingredientId: string,
  quantityNeeded: number,
): Promise<MenuItemIngredientWithIngredient> {
  // Use bulk recipe endpoint: read current, append, write back
  const current = await apiRequest<Record<string, unknown>>(
    `/api/warehouse/recipes/${menuItemId}`,
  );
  const currentIngredients = (current.ingredients as Record<string, unknown>[]) || [];
  const updated = [
    ...currentIngredients,
    { ingredient_id: ingredientId, quantity_needed: quantityNeeded },
  ];
  await apiRequest(`/api/warehouse/recipes/${menuItemId}`, {
    method: 'PUT',
    body: JSON.stringify({ items: updated }),
  });
  // Re-read to get the full updated list
  const fresh = await apiRequest<Record<string, unknown>>(
    `/api/warehouse/recipes/${menuItemId}`,
  );
  const freshIngredients = (fresh.ingredients as Record<string, unknown>[]) || [];
  const added = freshIngredients[freshIngredients.length - 1];
  return {
    id: '',
    menu_item_id: menuItemId,
    ingredient_id: ingredientId,
    quantity_needed: quantityNeeded,
    ingredient: {
      id: ingredientId,
      name: '',
      unit: '',
      min_stock: 0,
      category: null,
      created_at: '',
    },
  };
}

export async function deleteMenuItemIngredient(id: string): Promise<void> {
  // For now, this is a no-op since recipes use bulk PUT.
  // Individual ingredient removal would need a backend endpoint.
  console.warn('deleteMenuItemIngredient not implemented via HTTP API');
}

/* ──────────────── Warehouse management ──────────────── */

export async function updateIngredient(
  id: string,
  data: Partial<
    Omit<
      IngredientWithBatches,
      'id' | 'created_at' | 'total_stock' | 'ingredient_batches'
    >
  >,
): Promise<IngredientWithBatches> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/warehouse/ingredients/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return {
    id: raw.id as string,
    name: raw.name as string,
    unit: raw.unit as string,
    min_stock: raw.min_stock as number,
    category: (raw.category as string) ?? null,
    created_at: raw.created_at as string,
    ingredient_batches: [],
    total_stock: 0,
  } as IngredientWithBatches;
}

export async function deleteIngredient(id: string): Promise<void> {
  await apiRequest<void>(`/api/warehouse/ingredients/${id}`, {
    method: 'DELETE',
  });
}

export async function deleteIngredientBatch(id: string): Promise<void> {
  await apiRequest<void>(`/api/warehouse/batches/${id}`, {
    method: 'DELETE',
  });
}

/* ──────────────── Warehouse stats ──────────────── */

interface WarehouseStats {
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
}

export async function getWarehouseStats(): Promise<WarehouseStats> {
  return apiRequest<WarehouseStats>('/api/warehouse/stats');
}

/* ──────────────── Revenue tracking ──────────────── */

interface RevenueData {
  today: number;
  week: number;
  month: number;
}

export async function trackRevenue(): Promise<RevenueData> {
  return apiRequest<RevenueData>('/api/warehouse/revenue');
}

/* ──────────────── AI Chat — Conversations ──────────────── */

export async function saveConversation(
  conversation: Omit<Conversation, 'id' | 'created_at'>,
): Promise<Conversation> {
  // Chat is managed backend-side via POST /api/chat
  // This is kept for compatibility; conversations are auto-saved
  return {
    id: '',
    user_id: conversation.user_id,
    messages: conversation.messages,
    created_at: new Date().toISOString(),
  };
}

export async function getUserConversations(
  _userId: string,
): Promise<Conversation[]> {
  const raw = await apiRequest<Record<string, unknown>[]>(
    '/api/chat/conversations',
  );
  return raw.map((c) => ({
    id: c.id as string,
    user_id: _userId,
    messages: c.messages as Conversation['messages'],
    created_at: c.created_at as string,
  }));
}

/* ──────────────── AI Chat — Reservations ──────────────── */

interface CheckAvailabilityParams {
  date: string;
  time: string;
}

export async function checkReservationAvailability({
  date,
  time,
}: CheckAvailabilityParams): Promise<{
  available: boolean;
  currentReservations: number;
}> {
  const raw = await apiRequest<Record<string, unknown>[]>(
    `/api/reservations?date=${date}&time=${time}`,
  );
  // Backend doesn't have a dedicated availability check, so we check count client-side
  const currentReservations = raw.length;
  const maxPerSlot = 10;
  return {
    available: currentReservations < maxPerSlot,
    currentReservations,
  };
}

export async function createReservation(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'status'>,
): Promise<Reservation> {
  const raw = await apiRequest<Record<string, unknown>>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      notes: reservation.notes,
    }),
  });
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    date: raw.date as string,
    time: raw.time as string,
    guests: raw.guests as number,
    status: (raw.status as string) ?? 'pending',
    notes: (raw.notes as string) ?? null,
    created_at: raw.created_at as string,
  };
}

export async function getUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const raw = await apiRequest<Record<string, unknown>[]>('/api/reservations');
  return raw.map((r) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    date: r.date as string,
    time: r.time as string,
    guests: r.guests as number,
    status: r.status as string,
    notes: (r.notes as string) ?? null,
    created_at: r.created_at as string,
  }));
}

/* ──────────────── Admin — reservations ──────────────── */

export interface GetAllReservationsFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

export async function getAllReservations(
  filters?: GetAllReservationsFilters,
): Promise<ReservationWithProfile[]> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('start_date', filters.startDate);
  if (filters?.endDate) params.set('end_date', filters.endDate);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  const raw = await apiRequest<Record<string, unknown>[]>(
    `/api/reservations${qs ? `?${qs}` : ''}`,
  );
  return raw.map((r) => {
    const userRaw = r.user as Record<string, unknown> | null;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      date: r.date as string,
      time: r.time as string,
      guests: r.guests as number,
      status: r.status as string,
      notes: (r.notes as string) ?? null,
      created_at: r.created_at as string,
      profiles: userRaw
        ? {
            email: userRaw.email as string,
            full_name: userRaw.full_name as string,
          }
        : null,
    };
  });
}

export async function updateReservationStatus(
  id: string,
  status: 'confirmed' | 'cancelled',
): Promise<Reservation> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/reservations/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    },
  );
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    date: raw.date as string,
    time: raw.time as string,
    guests: raw.guests as number,
    status: raw.status as string,
    notes: (raw.notes as string) ?? null,
    created_at: raw.created_at as string,
  };
}
