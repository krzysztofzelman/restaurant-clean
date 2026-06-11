-- ============================================================
-- INIT.SQL — Schemat bazy danych dla aplikacji RESTAURACJA
-- Przystosowany do lokalnego PostgreSQL (bez Supabase)
-- ============================================================

-- ============================================================
-- 1. TABELA UŻYTKOWNIKÓW (zastępuje auth.users + profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'kitchen', 'admin', 'courier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. MENU
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. ZAMÓWIENIA
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','in_transit','delivered','cancelled')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','assigned','in_delivery','delivered')),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  delivery_address TEXT,
  notes TEXT,
  courier_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- 4. POZYCJE ZAMÓWIENIA
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- 5. MAGAZYN — Składniki, partie FIFO, receptury
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_stock DECIMAL NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredient_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL,
  cost_per_unit DECIMAL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_needed DECIMAL NOT NULL
);

-- ============================================================
-- 6. AI CZAT — Konwersacje
-- ============================================================
CREATE TABLE IF NOT EXISTS konwersacje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_konwersacje_user_id ON konwersacje(user_id);

-- ============================================================
-- 7. REZERWACJE
-- ============================================================
CREATE TABLE IF NOT EXISTS rezerwacje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rezerwacje_user_id ON rezerwacje(user_id);
CREATE INDEX IF NOT EXISTS idx_rezerwacje_date_time ON rezerwacje(date, time);

-- ============================================================
-- 8. FUNKCJE BIZNESOWE (przeniesione z Supabase)
-- ============================================================

-- FIFO: odejmowanie składników po potwierdzeniu zamówienia
CREATE OR REPLACE FUNCTION consume_ingredients_for_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_needed DECIMAL;
  v_remaining DECIMAL;
  v_batch_qty DECIMAL;
  v_batch_id UUID;
  v_shortage BOOLEAN := false;
BEGIN
  FOR r IN
    SELECT
      oi.quantity AS order_qty,
      mii.ingredient_id,
      mii.quantity_needed,
      i.name AS ingredient_name
    FROM order_items oi
    JOIN menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    JOIN ingredients i ON i.id = mii.ingredient_id
    WHERE oi.order_id = p_order_id
  LOOP
    v_needed := r.order_qty * r.quantity_needed;
    v_remaining := v_needed;

    FOR v_batch_id, v_batch_qty IN
      SELECT ib.id, ib.quantity
      FROM ingredient_batches ib
      WHERE ib.ingredient_id = r.ingredient_id
        AND ib.quantity > 0
      ORDER BY ib.received_at ASC, ib.id ASC
    LOOP
      IF v_remaining <= 0 THEN EXIT; END IF;

      IF v_batch_qty >= v_remaining THEN
        UPDATE ingredient_batches SET quantity = quantity - v_remaining WHERE id = v_batch_id;
        v_remaining := 0;
      ELSE
        v_remaining := v_remaining - v_batch_qty;
        UPDATE ingredient_batches SET quantity = 0 WHERE id = v_batch_id;
      END IF;
    END LOOP;

    IF v_remaining > 0 THEN
      v_shortage := true;
      RAISE WARNING 'Niedobór składnika "%": brakuje % (potrzebne %, dostępne %)',
        r.ingredient_name, v_remaining, v_needed, v_needed - v_remaining;
    END IF;
  END LOOP;

  DELETE FROM ingredient_batches WHERE quantity <= 0;

  IF v_shortage THEN
    RAISE WARNING 'Zamówienie % zostało potwierdzone, ale niektóre składniki są niedostępne.', p_order_id;
  END IF;
END;
$$;

-- Maszyna stanów zamówienia
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_courier_id UUID DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_order public.orders;
BEGIN
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Zamowienie o ID % nie istnieje', p_order_id USING HINT = 'check_order_id';
  END IF;

  IF NOT (
    (v_current_status = 'pending'    AND p_new_status IN ('confirmed', 'cancelled'))
    OR (v_current_status = 'confirmed'  AND p_new_status IN ('preparing', 'cancelled'))
    OR (v_current_status = 'preparing'  AND p_new_status IN ('ready', 'cancelled'))
    OR (v_current_status = 'ready'      AND p_new_status IN ('in_transit', 'cancelled'))
    OR (v_current_status = 'in_transit' AND p_new_status IN ('delivered', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Niedozwolone przejscie statusu: % -> %', v_current_status, p_new_status
      USING HINT = 'invalid_transition';
  END IF;

  UPDATE orders
  SET status = p_new_status, courier_id = COALESCE(p_courier_id, courier_id)
  WHERE id = p_order_id;

  IF p_new_status = 'confirmed' THEN
    BEGIN
      PERFORM consume_ingredients_for_order(p_order_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Blad podczas odejmowania skladnikow dla zamowienia %: %', p_order_id, SQLERRM;
    END;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;

-- Transakcyjne tworzenie zamówienia
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_user_id UUID,
  p_items JSONB,
  p_total_amount DECIMAL,
  p_delivery_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_item JSONB;
BEGIN
  INSERT INTO orders (user_id, status, total_amount, payment_status, delivery_address, notes)
  VALUES (p_user_id, 'pending', p_total_amount, 'unpaid', p_delivery_address, p_notes)
  RETURNING * INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
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

-- Agregacje revenue
CREATE OR REPLACE FUNCTION track_revenue()
RETURNS TABLE (today DECIMAL, week DECIMAL, month DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::DECIMAL,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('week', now())), 0)::DECIMAL,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::DECIMAL
  FROM orders
  WHERE payment_status = 'paid';
END;
$$;

-- Statystyki magazynu
CREATE OR REPLACE FUNCTION get_warehouse_stats()
RETURNS TABLE (low_stock_count INTEGER, expiring_soon_count INTEGER, expired_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stock_by_ingredient AS (
    SELECT i.id, i.min_stock, COALESCE(SUM(ib.quantity), 0) AS total_stock
    FROM ingredients i
    LEFT JOIN ingredient_batches ib ON ib.ingredient_id = i.id
    GROUP BY i.id, i.min_stock
  ),
  low_stock AS (
    SELECT COUNT(*)::INTEGER AS cnt FROM stock_by_ingredient WHERE total_stock <= min_stock
  ),
  batch_aging AS (
    SELECT
      COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < now())::INTEGER AS expired,
      COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at >= now() AND expires_at < now() + INTERVAL '7 days')::INTEGER AS expiring_soon
    FROM ingredient_batches
  )
  SELECT COALESCE(ls.cnt, 0), COALESCE(ba.expiring_soon, 0), COALESCE(ba.expired, 0)
  FROM low_stock ls, batch_aging ba;
END;
$$;

-- Anulowanie nieopłaconych zamówień (do uruchamiania przez Celery)
CREATE OR REPLACE FUNCTION cancel_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE orders
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND payment_status = 'unpaid'
    AND created_at < now() - INTERVAL '15 minutes';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ============================================================
-- 9. DANE POCZĄTKOWE
-- ============================================================

-- Użytkownicy testowi (hasła zostaną zahashowane przez aplikację przy starcie)
-- Patrz: backend/app/seed.py — uruchamiane przy pierwszym deployu
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@restauracja.pl',    '__SEED_ME__', 'Administrator', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'kitchen@restauracja.pl',  '__SEED_ME__', 'Kuchnia',       'kitchen'),
  ('00000000-0000-0000-0000-000000000003', 'kurier@restauracja.pl',   '__SEED_ME__', 'Kurier',        'courier'),
  ('00000000-0000-0000-0000-000000000004', 'jan@example.com',         '__SEED_ME__', 'Jan Kowalski',  'user')
ON CONFLICT (email) DO NOTHING;

-- Przykładowe menu
INSERT INTO menu_items (name, description, price, category, is_available) VALUES
  ('Schabowy z ziemniakami', 'Panierowany schabowy, ziemniaki, surówka z kapusty', 32.00, 'Obiady', true),
  ('Rosół z makaronem', 'Domowy rosół drobiowy z makaronem', 14.00, 'Zupy', true),
  ('Pierogi ruskie', 'Ręcznie lepione pierogi z twarogiem i ziemniakami', 22.00, 'Obiady', true),
  ('Cola', 'Napój gazowany 0.33l', 6.00, 'Napoje', true),
  ('Woda mineralna', 'Niegazowana 0.5l', 5.00, 'Napoje', true),
  ('Szarlotka na ciepło', 'Z lodami i bitą śmietaną', 18.00, 'Desery', true),
  ('Placki ziemniaczane', 'Z gulaszem i śmietaną', 26.00, 'Obiady', true),
  ('Pomidorowa z ryżem', 'Zupa pomidorowa z ryżem', 13.00, 'Zupy', true),
  ('Sok pomarańczowy', 'Świeżo wyciskany 0.3l', 9.00, 'Napoje', true),
  ('Naleśniki z serem', 'Z cukrem waniliowym i bitą śmietaną', 20.00, 'Desery', true)
ON CONFLICT DO NOTHING;
