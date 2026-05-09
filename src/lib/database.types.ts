// ============================================================
// Wygenerowano na podstawie: supabase-schema.sql
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'user' | 'kitchen' | 'admin' | 'courier';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';

export type DeliveryStatus = 'pending' | 'assigned' | 'in_delivery' | 'delivered';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  delivery_status: DeliveryStatus;
  total_amount: number;
  payment_status: PaymentStatus;
  delivery_address: string | null;
  notes: string | null;
  courier_id: string | null;
  created_at: string;
}

export interface OrderWithRelations extends Order {
  order_items: OrderItemWithMenuItem[];
  profiles?: Pick<Profile, 'full_name' | 'email'> | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderItemWithMenuItem extends OrderItem {
  menu_item: MenuItem;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  category: string | null;
  created_at: string;
  /** computed from batches */
  total_stock?: number;
}

export interface IngredientWithBatches extends Ingredient {
  ingredient_batches: Pick<IngredientBatch, 'quantity'>[];
}

export interface IngredientBatch {
  id: string;
  ingredient_id: string;
  quantity: number;
  cost_per_unit: number | null;
  received_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_needed: number;
}

export interface MenuItemIngredientWithIngredient extends MenuItemIngredient {
  ingredient: Ingredient;
}

// Helper type for Supabase response rows
export interface Tables {
  profiles: Profile;
  menu_items: MenuItem;
  orders: Order;
  order_items: OrderItem;
  ingredients: Ingredient;
  ingredient_batches: IngredientBatch;
  menu_item_ingredients: MenuItemIngredient;
}
