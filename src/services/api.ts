import { supabase } from '../lib/supabaseClient';
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
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function toggleMenuItemAvailability(
  id: string,
  isAvailable: boolean,
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addMenuItem(
  item: Omit<MenuItem, 'id' | 'created_at'>,
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([item])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuItem(
  id: string,
  updates: Partial<Omit<MenuItem, 'id' | 'created_at'>>,
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}

/* ──────────────── Menu image upload ──────────────── */

export async function uploadMenuImage(
  file: File,
  menuItemId: string,
): Promise<string> {
  const ext = file.name.split('.').pop();
  const filePath = `${menuItemId}/${menuItemId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('menu-images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/* ──────────────── Orders ──────────────── */

interface CreateOrderParams {
  userId: string;
  items: { id: string; quantity: number; price: number }[];
  totalAmount: number;
  deliveryAddress?: string;
  notes?: string;
}

export async function createOrder({
  userId,
  items,
  totalAmount,
  deliveryAddress,
  notes,
}: CreateOrderParams): Promise<Order> {
  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_user_id: userId,
    p_items: items,
    p_total_amount: totalAmount,
    p_delivery_address: deliveryAddress || null,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data as unknown as Order;
}

export async function getMyOrders(
  userId: string,
): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*, menu_item:menu_items(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithRelations[];
}

export async function getAllOrders(): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, order_items:order_items(*, menu_item:menu_items(*)), profiles!user_id(full_name, email)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithRelations[];
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<Order> {
  const { data, error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: status,
  });
  if (error) throw error;
  return data as unknown as Order;
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ──────────────── Courier / Delivery ──────────────── */

export async function getCourierOrders(): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, order_items:order_items(*, menu_item:menu_items(*)), profiles!user_id(full_name, email)',
    )
    .or('status.eq.ready,status.eq.in_transit')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithRelations[];
}

export async function getCourierHistory(
  courierId: string,
): Promise<OrderWithRelations[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, order_items:order_items(*, menu_item:menu_items(*)), profiles!user_id(full_name, email)',
    )
    .eq('courier_id', courierId)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithRelations[];
}

export async function updateDeliveryStatus(
  orderId: string,
  status: string,
  courierId?: string,
): Promise<void> {
  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_new_status: status,
    p_courier_id: courierId || null,
  });
  if (error) throw error;
}

/* ──────────────── Stripe payment ──────────────── */

export async function createPaymentIntent(
  orderId: string,
  amount: number,
): Promise<{ clientSecret: string }> {
  const { data, error } = await supabase.functions.invoke(
    'create-payment-intent',
    {
      body: { orderId, amount },
    },
  );
  if (error) throw error;
  return data as { clientSecret: string };
}

/* ──────────────── User profile ──────────────── */

export async function getUserProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/* ──────────────── Warehouse / Ingredients ──────────────── */

export async function getIngredients(): Promise<
  (IngredientWithBatches & { total_stock: number })[]
> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*, ingredient_batches(quantity)')
    .order('name', { ascending: true });
  if (error) throw error;
  // compute total stock from batches
  return data.map((ing: IngredientWithBatches) => ({
    ...ing,
    total_stock: (ing.ingredient_batches || []).reduce(
      (sum: number, b: { quantity: number }) => sum + Number(b.quantity),
      0,
    ),
  }));
}

export async function getIngredientBatches(
  ingredientId: string,
): Promise<IngredientBatch[]> {
  const { data, error } = await supabase
    .from('ingredient_batches')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .order('received_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addIngredient(
  data: Omit<IngredientWithBatches, 'id' | 'created_at' | 'total_stock' | 'ingredient_batches'>,
): Promise<IngredientWithBatches> {
  const { data: result, error } = await supabase
    .from('ingredients')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function addBatch(
  data: Omit<IngredientBatch, 'id' | 'created_at' | 'received_at'>,
): Promise<IngredientBatch> {
  const { data: result, error } = await supabase
    .from('ingredient_batches')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

/* ──────────────── Menu item ingredients (recipes) ──────────────── */

export async function getMenuItemIngredients(
  menuItemId: string,
): Promise<MenuItemIngredientWithIngredient[]> {
  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .select('*, ingredient:ingredients(*)')
    .eq('menu_item_id', menuItemId);
  if (error) throw error;
  return data as unknown as MenuItemIngredientWithIngredient[];
}

export async function addMenuItemIngredient(
  menuItemId: string,
  ingredientId: string,
  quantityNeeded: number,
): Promise<MenuItemIngredientWithIngredient> {
  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .insert([
      {
        menu_item_id: menuItemId,
        ingredient_id: ingredientId,
        quantity_needed: quantityNeeded,
      },
    ])
    .select('*, ingredient:ingredients(*)')
    .single();
  if (error) throw error;
  return data as unknown as MenuItemIngredientWithIngredient;
}

export async function deleteMenuItemIngredient(id: string): Promise<void> {
  const { error } = await supabase
    .from('menu_item_ingredients')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/* ──────────────── Warehouse management ──────────────── */

export async function updateIngredient(
  id: string,
  data: Partial<Omit<IngredientWithBatches, 'id' | 'created_at' | 'total_stock' | 'ingredient_batches'>>,
): Promise<IngredientWithBatches> {
  const { data: result, error } = await supabase
    .from('ingredients')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deleteIngredientBatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('ingredient_batches')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/* ──────────────── Warehouse stats ──────────────── */

interface WarehouseStats {
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
}

export async function getWarehouseStats(): Promise<WarehouseStats> {
  const { data, error } = await supabase.rpc('get_warehouse_stats');
  if (error) throw error;
  return data as unknown as WarehouseStats;
}

/* ──────────────── Revenue tracking ──────────────── */

interface RevenueData {
  today: number;
  week: number;
  month: number;
}

export async function trackRevenue(): Promise<RevenueData> {
  const { data, error } = await supabase.rpc('track_revenue');
  if (error) throw error;
  const row = data as unknown as { today: number; week: number; month: number };
  return row;
}

/* ──────────────── AI Chat — Conversations ──────────────── */

export async function saveConversation(
  conversation: Omit<Conversation, 'id' | 'created_at'>,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('konwersacje')
    .insert([conversation])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserConversations(
  userId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('konwersacje')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

/* ──────────────── AI Chat — Reservations ──────────────── */

interface CheckAvailabilityParams {
  date: string;
  time: string;
}

export async function checkReservationAvailability({
  date,
  time,
}: CheckAvailabilityParams): Promise<{ available: boolean; currentReservations: number }> {
  const { data, error } = await supabase
    .from('rezerwacje')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;

  // Zakładamy limit 10 rezerwacji na slot czasowy
  const currentReservations = data.length;
  const maxPerSlot = 10;
  return {
    available: currentReservations < maxPerSlot,
    currentReservations,
  };
}

export async function createReservation(
  reservation: Omit<Reservation, 'id' | 'created_at' | 'status'>,
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('rezerwacje')
    .insert([{ ...reservation, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('rezerwacje')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
  if (error) throw error;
  return data;
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
  let query = supabase
    .from('rezerwacje')
    .select('*, profiles!user_id(email, full_name)')
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ReservationWithProfile[];
}

export async function updateReservationStatus(
  id: string,
  status: 'confirmed' | 'cancelled',
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('rezerwacje')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
