-- ============================================================
-- MIGRATION: Agregacje po stronie SQL zamiast JS
-- 1. track_revenue() — dzienna/tygodniowa/miesięczna suma
-- 2. get_warehouse_stats() — niskie stany, przeterminowania
-- ============================================================

-- ──────────────── 1. Revenue tracking (SQL aggregation) ────────────────

CREATE OR REPLACE FUNCTION public.track_revenue()
RETURNS TABLE (
  today DECIMAL,
  week DECIMAL,
  month DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::DECIMAL AS today,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('week', now())), 0)::DECIMAL AS week,
    COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::DECIMAL AS month
  FROM public.orders
  WHERE payment_status = 'paid';
END;
$$;

-- ──────────────── 2. Warehouse stats (SQL aggregation) ────────────────

CREATE OR REPLACE FUNCTION public.get_warehouse_stats()
RETURNS TABLE (
  low_stock_count INTEGER,
  expiring_soon_count INTEGER,
  expired_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH stock_by_ingredient AS (
    SELECT
      i.id,
      i.min_stock,
      COALESCE(SUM(ib.quantity), 0) AS total_stock
    FROM public.ingredients i
    LEFT JOIN public.ingredient_batches ib ON ib.ingredient_id = i.id
    GROUP BY i.id, i.min_stock
  ),
  low_stock AS (
    SELECT COUNT(*)::INTEGER AS cnt
    FROM stock_by_ingredient
    WHERE total_stock <= min_stock
  ),
  batch_aging AS (
    SELECT
      COUNT(*) FILTER (
        WHERE expires_at IS NOT NULL AND expires_at < now()
      )::INTEGER AS expired,
      COUNT(*) FILTER (
        WHERE expires_at IS NOT NULL
          AND expires_at >= now()
          AND expires_at < now() + INTERVAL '7 days'
      )::INTEGER AS expiring_soon
    FROM public.ingredient_batches
  )
  SELECT
    COALESCE(ls.cnt, 0) AS low_stock_count,
    COALESCE(ba.expiring_soon, 0) AS expiring_soon_count,
    COALESCE(ba.expired, 0) AS expired_count
  FROM low_stock ls, batch_aging ba;
END;
$$;
