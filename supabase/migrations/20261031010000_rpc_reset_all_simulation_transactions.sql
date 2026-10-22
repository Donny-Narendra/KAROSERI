-- ============================================================================
-- MIGRATION: 20261031010000_rpc_reset_all_simulation_transactions.sql
-- Description: RPC Reset Seluruh Transaksi Simulasi (SPK & Non-SPK)
-- Mempertahankan master materials, product packages, expense categories, profiles, dan OPEX
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_all_simulation_transactions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Transaksi Finansial Kasir & Penagihan
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.payments CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.invoices CASCADE';
  END IF;

  -- 2. Transaksi Kas Non-SPK / Buku Kas
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cash_ledger_transactions' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.cash_ledger_transactions CASCADE';
  END IF;

  -- 3. Transaksi Logistik Gudang
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inventory_transactions' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.inventory_transactions CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'material_requisition_items' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.material_requisition_items CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'material_requisitions' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.material_requisitions CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'goods_issues' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.goods_issues CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'material_returns' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.material_returns CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inventory_audit_logs' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.inventory_audit_logs CASCADE';
  END IF;

  -- 4. Operasional Mandor & WBS
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spk_borongan' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.spk_borongan CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spk_overhead_logs' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.spk_overhead_logs CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wbs_checklists' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.wbs_checklists CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'qc_inspections' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.qc_inspections CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spk_assets' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.spk_assets CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spk_amendments' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.spk_amendments CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'change_order_items' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.change_order_items CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'change_orders' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.change_orders CASCADE';
  END IF;

  -- 5. Estimasi RAB
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rab_items' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.rab_items CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rab_estimations' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.rab_estimations CASCADE';
  END IF;

  -- 6. Tabel Induk SPK
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spk' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'TRUNCATE TABLE public.spk CASCADE';
  END IF;

  -- 7. Reset kuantitas stok material di gudang ke 100 agar langsung siap untuk simulasi baru
  UPDATE public.materials SET current_stock = 100 WHERE id IS NOT NULL;

  -- 8. Buka kunci saldo awal jika ada
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'initial_balances' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'UPDATE public.initial_balances SET is_locked = false WHERE id IS NOT NULL';
  END IF;

  -- Reload schema cache PostgREST
  PERFORM pg_notify('pgrst', 'reload schema');

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Seluruh data transaksi simulasi berhasil dibersihkan dan stok material diatur ulang ke 100.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_simulation_transactions() TO authenticated, anon;
