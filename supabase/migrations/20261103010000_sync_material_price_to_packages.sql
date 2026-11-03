-- ==============================================================================
-- MIGRATION: 20261103010000_sync_material_price_to_packages.sql
-- Description:
--   Cascade perubahan harga master material (materials.cost_price) ke template
--   BOM Paket Barang Jadi (package_items.cost_per_unit) dan menjaga akumulasi
--   estimasi HPP paket (product_packages.calculated_cogs) selalu akurat.
--
-- IMMUTABILITY GUARDRAIL:
--   Trigger di file ini HANYA menyentuh package_items & product_packages.
--   rab_items, change_order_items, dan seluruh view/laporan HPP aktual
--   (mis. view_spk_job_profitability) TIDAK PERNAH diubah — tetap menjadi
--   historical snapshot harga saat transaksi disetujui.
--
-- Catatan skema: kolom harga komponen BOM yang sebenarnya adalah
--   package_items.cost_per_unit (subtotal = quantity * cost_per_unit dihitung
--   on-the-fly). Kolom product_packages.calculated_cogs ditambahkan di sini.
-- ==============================================================================

-- 0. Kolom akumulasi HPP paket
ALTER TABLE public.product_packages
  ADD COLUMN IF NOT EXISTS calculated_cogs NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.product_packages.calculated_cogs IS
  'Estimasi HPP paket = SUM(package_items.quantity * cost_per_unit). Dipelihara otomatis oleh trigger.';

-- 1. Helper: recalculate calculated_cogs untuk satu paket
CREATE OR REPLACE FUNCTION public.recalculate_package_cogs(p_package_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.product_packages p
  SET calculated_cogs = (
    SELECT COALESCE(SUM(COALESCE(pi.quantity, 0) * COALESCE(pi.cost_per_unit, 0)), 0)
    FROM public.package_items pi
    WHERE pi.package_id = p.id
  )
  WHERE p.id = p_package_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger pada package_items: jaga calculated_cogs tetap sinkron untuk
--    setiap INSERT / UPDATE / DELETE komponen (termasuk edit manual via UI
--    maupun cascade dari trigger materials di bawah).
CREATE OR REPLACE FUNCTION public.trg_package_items_recalc_cogs()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recalculate_package_cogs(OLD.package_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.package_id IS DISTINCT FROM OLD.package_id) THEN
    PERFORM public.recalculate_package_cogs(NEW.package_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_package_items_recalc_cogs ON public.package_items;
CREATE TRIGGER trg_package_items_recalc_cogs
AFTER INSERT OR UPDATE OR DELETE ON public.package_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_package_items_recalc_cogs();

-- 3. Trigger Function: sinkronisasi harga material ke master komponen paket (BOM)
CREATE OR REPLACE FUNCTION public.sync_material_price_to_package_items()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.cost_price IS DISTINCT FROM NEW.cost_price)
     OR (OLD.selling_price IS DISTINCT FROM NEW.selling_price) THEN

    -- Perbarui harga satuan komponen di template BOM.
    -- (calculated_cogs paket otomatis ter-recalculate oleh trg_package_items_recalc_cogs)
    IF NEW.cost_price IS NOT NULL THEN
      UPDATE public.package_items
      SET cost_per_unit = NEW.cost_price
      WHERE material_id = NEW.id
        AND cost_per_unit IS DISTINCT FROM NEW.cost_price;
    END IF;

    -- GUARDRAIL: sengaja TIDAK ADA UPDATE ke rab_items / change_order_items.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_material_price_to_packages ON public.materials;
CREATE TRIGGER trg_sync_material_price_to_packages
AFTER UPDATE OF cost_price, selling_price ON public.materials
FOR EACH ROW
EXECUTE FUNCTION public.sync_material_price_to_package_items();

-- 4. Backfill awal calculated_cogs untuk semua paket yang sudah ada
UPDATE public.product_packages p
SET calculated_cogs = COALESCE((
  SELECT SUM(COALESCE(pi.quantity, 0) * COALESCE(pi.cost_per_unit, 0))
  FROM public.package_items pi
  WHERE pi.package_id = p.id
), 0);
