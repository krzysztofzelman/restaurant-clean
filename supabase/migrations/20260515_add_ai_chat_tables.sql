-- ============================================================
-- Migration: Add AI Chat support tables
-- Created: 2026-05-15
-- ============================================================

-- 1. Conversations table (konwersacje)
CREATE TABLE IF NOT EXISTS public.konwersacje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Reservations table (rezerwacje)
CREATE TABLE IF NOT EXISTS public.rezerwacje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INTEGER NOT NULL CHECK (guests >= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_konwersacje_user_id ON public.konwersacje(user_id);
CREATE INDEX IF NOT EXISTS idx_rezerwacje_user_id ON public.rezerwacje(user_id);
CREATE INDEX IF NOT EXISTS idx_rezerwacje_date_time ON public.rezerwacje(date, time);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.konwersacje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rezerwacje ENABLE ROW LEVEL SECURITY;

-- Konwersacje: users can manage their own, admins see all
CREATE POLICY "Users view own conversations"
  ON public.konwersacje FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own conversations"
  ON public.konwersacje FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all conversations"
  ON public.konwersacje FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins delete conversations"
  ON public.konwersacje FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Rezerwacje: users manage own, staff can view all
CREATE POLICY "Users view own reservations"
  ON public.rezerwacje FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reservations"
  ON public.rezerwacje FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reservations"
  ON public.rezerwacje FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff view all reservations"
  ON public.rezerwacje FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

CREATE POLICY "Staff update all reservations"
  ON public.rezerwacje FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- ============================================================
-- Restaurant info (used by AI — inserted directly)
-- ============================================================

-- Static restaurant info function for the AI
-- In a real deployment, this could be a table; for now it's hardcoded in the edge function.
