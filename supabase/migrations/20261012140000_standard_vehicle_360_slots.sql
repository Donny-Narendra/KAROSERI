-- Migration: 20261012140000_standard_vehicle_360_slots.sql
-- Description: Dokumentasi & standarisasi skema metadata JSONB vehicle_photos untuk 5 sudut tetap (depan, belakang, kanan, kiri, interior) dan foto tambahan.
-- CATATAN: Dibuat untuk review manual dan eksekusi manual via Supabase SQL Editor jika diperlukan.

-- 1. Pastikan kolom vehicle_photos tersedia dengan tipe jsonb dan default array kosong
ALTER TABLE public.spk 
ADD COLUMN IF NOT EXISTS vehicle_photos jsonb DEFAULT '[]'::jsonb;

-- 2. Komentar dokumentasi struktur JSONB yang didukung:
-- Format Array (backward-compatible & default):
-- [
--   { "secure_url": "https://...", "public_id": "...", "angle": "depan" },
--   { "secure_url": "https://...", "public_id": "...", "angle": "belakang" },
--   { "secure_url": "https://...", "public_id": "...", "angle": "kanan" },
--   { "secure_url": "https://...", "public_id": "...", "angle": "kiri" },
--   { "secure_url": "https://...", "public_id": "...", "angle": "interior" },
--   { "secure_url": "https://...", "public_id": "...", "angle": "Tambahan ..." }
-- ]
--
-- 5 Sudut Standar (Fixed Positional Slots):
-- - depan
-- - belakang
-- - kanan
-- - kiri
-- - interior
COMMENT ON COLUMN public.spk.vehicle_photos IS 'JSONB array of vehicle check-in photos with standard positional angles (depan, belakang, kanan, kiri, interior) and optional additional photos';
