-- ============================================================
-- RESTAURACJA – Kompletny skrypt SQL do Supabase SQL Editor
-- Uruchom w kolejności: 1 → 2 → 3 → 4
-- ============================================================

-- ============================================================
-- 1. TABELE
-- ============================================================

-- Tabela profili (synchornizowana z auth.users przez trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'kitchen', 'admin', 'courier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Menu
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Dodanie kolumny image_url dla istniejących baz (idempotentne)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Zamówienia
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','in_transit','delivered','cancelled')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','assigned','in_delivery','delivered')),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  delivery_address TEXT,
  notes TEXT,
  courier_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Dodanie kolumn delivery_status i courier_id dla istniejących baz (idempotentne)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','assigned','in_delivery','delivered'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'courier_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN courier_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Pozycje zamówienia
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. TRIGGER: synchronizacja auth.users → public.profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'user',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Dodatkowy trigger dla aktualizacji emaila
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. FUNKCJA CRON: anulowanie nieopłaconych zamówień po 15 min
-- ============================================================

-- Wymaga włączonego rozszerzenia pg_cron w Supabase:
-- https://supabase.com/docs/guides/platform/database-extensions
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cancel_unpaid_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND payment_status = 'unpaid'
    AND created_at < now() - INTERVAL '15 minutes';
END;
$$;

-- Odkomentuj poniższą linię, aby uruchomić cron co minutę:
-- SELECT cron.schedule('cancel-unpaid-orders', '* * * * *', 'SELECT public.cancel_unpaid_orders();');

-- ============================================================
-- 4. POLITYKI RLS (Row Level Security)
-- ============================================================

-- Profiles: każdy widzi swój profil, admin widzi wszystkie
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('kitchen', 'admin')
    )
  );

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Menu items: każdy może czytać, tylko admin może modyfikować
CREATE POLICY "Anyone can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update menu items"
  ON public.menu_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete menu items"
  ON public.menu_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: użytkownik widzi swoje, kuchnia/admin widzi wszystkie
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('kitchen', 'admin')
    )
  );

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NEW.total_amount = OLD.total_amount
    AND NEW.payment_status = OLD.payment_status
  );

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('kitchen', 'admin')
    )
  );

-- Courier: widzi zamówienia ready (nieprzypisane) lub in_transit (swoje)
CREATE POLICY "Couriers can view delivery orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'courier'
    )
    AND (
      (status = 'ready' AND courier_id IS NULL)
      OR (status = 'in_transit' AND courier_id = auth.uid())
      OR (status = 'delivered' AND courier_id = auth.uid())
    )
  );

-- Courier: może aktualizować tylko swoje zamówienia (lub nieprzypisane)
CREATE POLICY "Couriers can update delivery status"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'courier'
    )
    AND (courier_id = auth.uid() OR courier_id IS NULL)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'courier'
    )
  );

-- Order items: użytkownik widzi swoje, kuchnia/admin widzi wszystkie
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('kitchen', 'admin')
    )
  );

-- Courier: widzi pozycje zamówień dostępnych dla kuriera
CREATE POLICY "Couriers can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (
          orders.status = 'ready'
          OR orders.status = 'in_transit'
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'courier'
    )
  );

CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. MAGAZYN – Składniki, partie FIFO i receptury
-- ============================================================

-- Składniki
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_stock DECIMAL NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Partie składników (FIFO)
CREATE TABLE IF NOT EXISTS public.ingredient_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL,
  cost_per_unit DECIMAL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredient_batches ENABLE ROW LEVEL SECURITY;

-- Receptury (ile składnika potrzeba na danie)
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity_needed DECIMAL NOT NULL
);

ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS: Ingredients – SELECT dla wszystkich zalogowanych, INSERT/UPDATE/DELETE tylko admin
CREATE POLICY "Staff can view ingredients"
  ON public.ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('user', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Admins can insert ingredients"
  ON public.ingredients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update ingredients"
  ON public.ingredients FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete ingredients"
  ON public.ingredients FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS: Ingredient batches – SELECT dla wszystkich zalogowanych, INSERT/UPDATE/DELETE tylko admin
CREATE POLICY "Staff can view ingredient batches"
  ON public.ingredient_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('user', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Admins can insert ingredient batches"
  ON public.ingredient_batches FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update ingredient batches"
  ON public.ingredient_batches FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete ingredient batches"
  ON public.ingredient_batches FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS: Menu item ingredients – SELECT dla wszystkich zalogowanych, INSERT/UPDATE/DELETE tylko admin
CREATE POLICY "Staff can view menu item ingredients"
  ON public.menu_item_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('user', 'kitchen', 'admin')
    )
  );

CREATE POLICY "Admins can insert menu item ingredients"
  ON public.menu_item_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update menu item ingredients"
  ON public.menu_item_ingredients FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete menu item ingredients"
  ON public.menu_item_ingredients FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. PRZYKŁADOWE DANE (opcjonalnie)
-- ============================================================

INSERT INTO public.menu_items (name, description, price, category, is_available) VALUES
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

-- ============================================================
-- MIGRACJA: Dodanie statusu 'in_transit' do orders
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','confirmed','preparing','ready','in_transit','delivered','cancelled'));

-- ============================================================
-- 7. FUNKCJA FIFO: odejmowanie składników z magazynu po potwierdzeniu zamówienia
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_ingredients_for_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  r RECORD;
  v_needed DECIMAL;
  v_remaining DECIMAL;
  v_batch_qty DECIMAL;
  v_batch_id UUID;
  v_shortage BOOLEAN := false;
BEGIN
  -- Dla każdej pozycji zamówienia pobierz potrzebne składniki z receptury
  FOR r IN
    SELECT
      oi.quantity AS order_qty,
      mii.ingredient_id,
      mii.quantity_needed,
      i.name AS ingredient_name
    FROM public.order_items oi
    JOIN public.menu_item_ingredients mii ON mii.menu_item_id = oi.menu_item_id
    JOIN public.ingredients i ON i.id = mii.ingredient_id
    WHERE oi.order_id = p_order_id
  LOOP
    v_needed := r.order_qty * r.quantity_needed;
    v_remaining := v_needed;

    -- Pobierz najstarsze partie (FIFO) dla tego składnika
    FOR v_batch_id, v_batch_qty IN
      SELECT ib.id, ib.quantity
      FROM public.ingredient_batches ib
      WHERE ib.ingredient_id = r.ingredient_id
        AND ib.quantity > 0
      ORDER BY ib.received_at ASC, ib.id ASC
    LOOP
      IF v_remaining <= 0 THEN
        EXIT;
      END IF;

      IF v_batch_qty >= v_remaining THEN
        -- W tej partii jest wystarczająco
        UPDATE public.ingredient_batches
        SET quantity = quantity - v_remaining
        WHERE id = v_batch_id;
        v_remaining := 0;
      ELSE
        -- Partia nie wystarcza, bierzemy całość i idziemy dalej
        v_remaining := v_remaining - v_batch_qty;
        UPDATE public.ingredient_batches
        SET quantity = 0
        WHERE id = v_batch_id;
      END IF;
    END LOOP;

    -- Jeśli po wyczerpaniu wszystkich partii wciąż brakuje
    IF v_remaining > 0 THEN
      v_shortage := true;
      RAISE WARNING 'Niedobór składnika "%": brakuje % (potrzebne %, dostępne %)',
        r.ingredient_name,
        v_remaining,
        v_needed,
        v_needed - v_remaining;
    END IF;
  END LOOP;

  -- Usuń partie, które osiągnęły 0 (sprzątanie)
  DELETE FROM public.ingredient_batches
  WHERE quantity <= 0;

  IF v_shortage THEN
    RAISE WARNING 'Zamówienie % zostało potwierdzone, ale niektóre składniki są niedostępne.', p_order_id;
  END IF;
END;
$$;
