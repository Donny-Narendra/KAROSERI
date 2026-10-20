-- Migration: 20261022020000_add_waste_factor_to_rab_items.sql
-- Description: Add waste_factor and waste_factor_percentage columns to rab_items table and reload PostgREST schema cache.

-- 1. Tambahkan kolom waste_factor ke rab_items jika belum ada
ALTER TABLE public.rab_items 
ADD COLUMN IF NOT EXISTS waste_factor NUMERIC(5, 2) DEFAULT 0;

-- 2. Tambahkan juga alias waste_factor_percentage jika ada kode yang merujuknya
ALTER TABLE public.rab_items 
ADD COLUMN IF NOT EXISTS waste_factor_percentage NUMERIC(5, 2) DEFAULT 0;

-- 3. Reload skema cache PostgREST agar Supabase langsung mengenali kolom baru
NOTIFY pgrst, 'reload schema';
