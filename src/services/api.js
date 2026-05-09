import { supabase } from '../lib/supabaseClient';

/* ──────────────── Menu items ──────────────── */

export async function getMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function toggleMenuItemAvailability(id, isAvailable) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addMenuItem(item) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert([item])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuItem(id, updates) {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItem(id) {
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw error;
}

/* ──────────────── Menu image upload ──────────────── */

export async function uploadMenuImage(file, menuItemId) {
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

export async function createOrder({ userId, items, totalAmount, deliveryAddress, notes }) {
  // 1. create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        user_id: userId,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'unpaid',
        delivery_address: deliveryAddress || null,
        notes: notes || null,
      },
    ])
    .select()
    .single();
  if (orderError) throw orderError;

  // 2. create order_items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
    subtotal: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  if (itemsError) throw itemsError;

  return order;
}

export async function getMyOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*, menu_item:menu_items(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*, menu_item:menu_items(*)), profiles:user_id(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;

  // Gdy zamówienie jest potwierdzane — odejmij składniki z magazynu (FIFO)
  if (status === 'confirmed') {
    const { error: consumeError } = await supabase.rpc('consume_ingredients_for_order', {
      p_order_id: orderId,
    });
    if (consumeError) {
      // Logujemy błąd, ale nie blokujemy — zamówienie już jest potwierdzone
      console.warn('Błąd podczas odejmowania składników (zamówienie potwierdzone):', consumeError);
    }
  }

  return data;
}

export async function updatePaymentStatus(orderId, paymentStatus) {
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

export async function getCourierOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*, menu_item:menu_items(*)), profiles:user_id(full_name, email)')
    .or('status.eq.ready,status.eq.in_transit')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCourierHistory(courierId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items:order_items(*, menu_item:menu_items(*)), profiles:user_id(full_name, email)')
    .eq('courier_id', courierId)
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateDeliveryStatus(orderId, status, courierId) {
  const updates = { status };
  if (courierId) {
    updates.courier_id = courierId;
  }
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ──────────────── Stripe payment ──────────────── */

export async function createPaymentIntent(orderId, amount) {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { orderId, amount },
  });
  if (error) throw error;
  return data; // { clientSecret }
}

/* ──────────────── User profile ──────────────── */

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/* ──────────────── Warehouse / Ingredients ──────────────── */

export async function getIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*, ingredient_batches(quantity)')
    .order('name', { ascending: true });
  if (error) throw error;
  // compute total stock from batches
  return data.map((ing) => ({
    ...ing,
    total_stock: (ing.ingredient_batches || []).reduce(
      (sum, b) => sum + Number(b.quantity),
      0
    ),
  }));
}

export async function getIngredientBatches(ingredientId) {
  const { data, error } = await supabase
    .from('ingredient_batches')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .order('received_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addIngredient(data) {
  const { data: result, error } = await supabase
    .from('ingredients')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function addBatch(data) {
  const { data: result, error } = await supabase
    .from('ingredient_batches')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return result;
}

/* ──────────────── Menu item ingredients (recipes) ──────────────── */

export async function getMenuItemIngredients(menuItemId) {
  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .select('*, ingredient:ingredients(*)')
    .eq('menu_item_id', menuItemId);
  if (error) throw error;
  return data;
}

export async function addMenuItemIngredient(menuItemId, ingredientId, quantityNeeded) {
  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .insert([{ menu_item_id: menuItemId, ingredient_id: ingredientId, quantity_needed: quantityNeeded }])
    .select('*, ingredient:ingredients(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMenuItemIngredient(id) {
  const { error } = await supabase
    .from('menu_item_ingredients')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
