-- Migration: 20261014150000_sync_spk_borongan_status_enum.sql
-- Description: Add 'CANCELLED' value to spk_borongan_status enum if not already present
-- and create indexes for optimized allocation lookups across WBS & SPK Borongan.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'spk_borongan_status' AND pg_enum.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE public.spk_borongan_status ADD VALUE 'CANCELLED';
  END IF;
END $$;

-- Indexes for high-performance WBS allocation queries
CREATE INDEX IF NOT EXISTS idx_spk_borongan_spk_status ON public.spk_borongan(spk_id, status);
CREATE INDEX IF NOT EXISTS idx_spk_borongan_wbs_category ON public.spk_borongan(wbs_category);
