-- ============================================================
-- MIGRATION: State machine dla statusów zamówienia
-- Funkcja update_order_status() waliduje przejścia
-- ============================================================

-- Dozwolone przejścia: { old_status → [new_status, ...] }
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_courier_id UUID DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
  v_order public.orders;
  v_caller_role TEXT;
BEGIN
  -- Pobierz aktualny status
  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Zamówienie o ID % nie istnieje', p_order_id
      USING HINT = 'check_order_id';
  END IF;

  -- Walidacja przejścia statusu
  IF NOT CASE v_current_status
    WHEN 'pending'    THEN p_new_status IN ('confirmed', 'cancelled')
    WHEN 'confirmed'  THEN p_new_status IN ('preparing', 'cancelled')
    WHEN 'preparing'  THEN p_new_status IN ('ready', 'cancelled')
    WHEN 'ready'      THEN p_new_status IN ('in_transit', 'cancelled')
    WHEN 'in_transit' THEN p_new_status IN ('delivered', 'cancelled')
    WHEN 'delivered'  THEN FALSE  -- delivered jest końcowe
    WHEN 'cancelled'  THEN FALSE  -- cancelled jest końcowe
    ELSE FALSE
  END THEN
    RAISE EXCEPTION 'Niedozwolone przejście statusu: % → %', v_current_status, p_new_status
      USING HINT = 'invalid_transition';
  END IF;

  -- Aktualizacja
  UPDATE public.orders
  SET
    status = p_new_status,
    courier_id = COALESCE(p_courier_id, courier_id)
  WHERE id = p_order_id;

  -- Gdy zamówienie jest potwierdzane — odejmij składniki z magazynu (FIFO)
  IF p_new_status = 'confirmed' THEN
    BEGIN
      PERFORM public.consume_ingredients_for_order(p_order_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Błąd podczas odejmowania składników dla zamówienia %: %', p_order_id, SQLERRM;
    END;
  END IF;

  -- Zwróć zaktualizowany rekord
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;
