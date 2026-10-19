-- Migration: Add rab_item_id to spk_overhead_logs
-- Description: Links factory overhead logs directly to budgeted rab_items for real-time variance and WBS allocation tracking.

ALTER TABLE public.spk_overhead_logs
  ADD COLUMN IF NOT EXISTS rab_item_id UUID REFERENCES public.rab_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spk_overhead_logs_rab_item_id
  ON public.spk_overhead_logs(rab_item_id);
