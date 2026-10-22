-- Migration: 20261023020000_backfill_package_name_issues.sql
-- Description: Backfill package_name on material_requisition_items, inventory_transactions, and goods_issues

-- 1. Pastikan kolom package_name ada di tabel logistik
ALTER TABLE public.material_requisition_items ADD COLUMN IF NOT EXISTS package_name TEXT;

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN 
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS package_name TEXT; 
  END IF; 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goods_issues') THEN 
    ALTER TABLE public.goods_issues ADD COLUMN IF NOT EXISTS package_name TEXT; 
  END IF; 
END $$;

-- 2. Sinkronkan package_name dari rab_items ke material_requisition_items
-- Catatan PostgreSQL: Tabel target (mri) tidak boleh direferensikan pada klausa ON di dalam FROM,
-- melainkan harus direferensikan pada klausa WHERE.
UPDATE public.material_requisition_items mri
SET package_name = pp.name
FROM public.material_requisitions mr
JOIN public.rab_estimations re ON re.spk_id = mr.spk_id
JOIN public.rab_items ri ON ri.rab_estimation_id = re.id
JOIN public.product_packages pp ON pp.id = ri.package_id
WHERE mri.requisition_id = mr.id
  AND mri.material_id = ri.material_id
  AND (mri.package_name IS NULL OR mri.package_name = '');

-- Fallback jika rab_items terhubung via rab_item_id langsung
UPDATE public.material_requisition_items mri
SET package_name = pp.name
FROM public.rab_items ri
JOIN public.product_packages pp ON pp.id = ri.package_id
WHERE mri.rab_item_id = ri.id
  AND (mri.package_name IS NULL OR mri.package_name = '');

-- Fallback jika rab_items memiliki kolom spk_id langsung
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'spk_id') THEN 
    EXECUTE '
      UPDATE public.material_requisition_items mri
      SET package_name = pp.name
      FROM public.material_requisitions mr
      JOIN public.rab_items ri ON ri.spk_id = mr.spk_id
      JOIN public.product_packages pp ON pp.id = ri.package_id
      WHERE mri.requisition_id = mr.id
        AND mri.material_id = ri.material_id
        AND (mri.package_name IS NULL OR mri.package_name = '''')
    ';
  END IF; 
END $$;

-- 3. Sinkronkan package_name ke inventory_transactions / goods_issues jika ada
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN 
    -- Sinkronisasi via requisition_item_id
    UPDATE public.inventory_transactions it 
    SET package_name = mri.package_name 
    FROM public.material_requisition_items mri 
    WHERE it.requisition_item_id = mri.id 
      AND mri.package_name IS NOT NULL 
      AND (it.package_name IS NULL OR it.package_name = '');

    -- Sinkronisasi direct via spk_id + material_id + rab_estimations
    UPDATE public.inventory_transactions it
    SET package_name = pp.name
    FROM public.rab_estimations re
    JOIN public.rab_items ri ON ri.rab_estimation_id = re.id
    JOIN public.product_packages pp ON pp.id = ri.package_id
    WHERE it.spk_id = re.spk_id
      AND it.material_id = ri.material_id
      AND (it.package_name IS NULL OR it.package_name = '');

    -- Sinkronisasi direct via spk_id jika kolom spk_id ada di rab_items
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'spk_id') THEN
      EXECUTE '
        UPDATE public.inventory_transactions it
        SET package_name = pp.name
        FROM public.rab_items ri
        JOIN public.product_packages pp ON pp.id = ri.package_id
        WHERE it.spk_id = ri.spk_id
          AND it.material_id = ri.material_id
          AND (it.package_name IS NULL OR it.package_name = '''')
      ';
    END IF;
  END IF; 

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goods_issues') THEN 
    UPDATE public.goods_issues gi 
    SET package_name = mri.package_name 
    FROM public.material_requisition_items mri 
    WHERE gi.requisition_item_id = mri.id 
      AND mri.package_name IS NOT NULL 
      AND (gi.package_name IS NULL OR gi.package_name = ''); 

    UPDATE public.goods_issues gi
    SET package_name = pp.name
    FROM public.rab_estimations re
    JOIN public.rab_items ri ON ri.rab_estimation_id = re.id
    JOIN public.product_packages pp ON pp.id = ri.package_id
    WHERE gi.spk_id = re.spk_id
      AND gi.material_id = ri.material_id
      AND (gi.package_name IS NULL OR gi.package_name = '');

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'spk_id') THEN
      EXECUTE '
        UPDATE public.goods_issues gi
        SET package_name = pp.name
        FROM public.rab_items ri
        JOIN public.product_packages pp ON pp.id = ri.package_id
        WHERE gi.spk_id = ri.spk_id
          AND gi.material_id = ri.material_id
          AND (gi.package_name IS NULL OR gi.package_name = '''')
      ';
    END IF;
  END IF; 
END $$;
