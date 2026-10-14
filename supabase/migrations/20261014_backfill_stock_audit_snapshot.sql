-- Migration: Backfill stock_before and stock_after for legacy transactions
-- Description: Recalculates stock_before and stock_after for existing inventory transactions where snapshot is 0
-- Instructions: Run this manually in the Supabase SQL Editor if needed.

UPDATE public.inventory_transactions it
SET 
  stock_after = COALESCE(m.current_stock, 0),
  stock_before = COALESCE(m.current_stock, 0) + it.quantity_issued
FROM public.materials m
WHERE it.material_id = m.id
  AND (it.stock_before = 0 OR it.stock_before IS NULL)
  AND (it.stock_after = 0 OR it.stock_after IS NULL)
  AND it.quantity_issued > 0;
