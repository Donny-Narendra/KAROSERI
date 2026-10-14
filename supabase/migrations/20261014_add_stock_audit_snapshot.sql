-- Migration: Add stock snapshot columns for audit tracking in warehouse
-- Description: Adds stock_before and stock_after to public.inventory_transactions
-- Instructions: Run this manually in the Supabase SQL Editor.

-- 1. Tambahkan kolom snapshot stok pada tabel inventory_transactions (tabel riwayat pengeluaran barang)
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS stock_before NUMERIC DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS stock_after NUMERIC DEFAULT 0;

-- 2. Buat indeks untuk mempercepat kueri riwayat audit transaksi terbaru
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_recent_audit
ON public.inventory_transactions (issued_at DESC);
