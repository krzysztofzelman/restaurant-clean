-- ============================================================
-- MIGRATION: Transakcyjne tworzenie zamówienia
-- create_order_with_items() — INSERT orders + order_items
-- w jednej transakcji (atomiczne)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_user_id UUID,
  p_items JSONB,           -- [{"id": "uuid", "quantity": 2, "price": 22.00}, ...]
  p_total_amount DECIMAL,
  p_delivery_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_order public.orders;
  v_item JSONB;
BEGIN
  -- 1. INSERT orders
  INSERT INTO public.orders (user_id, status, total_amount, payment_status, delivery_address, notes)
  VALUES (
    p_user_id,
    'pending',
    p_total_amount,
    'unpaid',
    p_delivery_address,
    p_notes
  )
  RETURNING * INTO v_order;

  -- 2. INSERT order_items (w pętli dla każdego elementu JSON)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
    VALUES (
      v_order.id,
      (v_item->>'id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL,
      (v_item->>'quantity')::INTEGER * (v_item->>'price')::DECIMAL
    );
  END LOOP;

  RETURN v_order;
END;
$$;
