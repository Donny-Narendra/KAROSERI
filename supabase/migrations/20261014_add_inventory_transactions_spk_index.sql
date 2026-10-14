-- Migration: Add composite index for inventory_transactions by spk_id and issued_at
-- Description: Optimizes SPK-filtered queries on Recent Material Issues in /warehouse
-- Instructions: Run this manually in the Supabase SQL Editor if needed.

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_spk_issued 
ON public.inventory_transactions (spk_id, issued_at DESC);
