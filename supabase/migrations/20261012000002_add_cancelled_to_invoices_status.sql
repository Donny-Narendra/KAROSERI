-- Migration: Add 'CANCELLED' to invoices status check constraint
-- Catatan: Eksekusi skrip ini secara manual di Supabase SQL Editor jika diperlukan fitur pembatalan draft invoice.

DO $$
BEGIN
    -- Drop constraint lama jika ada
    ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

    -- Tambahkan kembali constraint dengan status CANCELLED
    ALTER TABLE public.invoices 
    ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('DRAFT', 'UNPAID', 'LUNAS', 'CANCELLED'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Gagal memperbarui constraint invoices_status_check: %', SQLERRM;
END $$;
