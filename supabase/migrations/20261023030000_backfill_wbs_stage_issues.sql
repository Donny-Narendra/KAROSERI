-- Migration: 20261023030000_backfill_wbs_stage_issues.sql
-- Description: Backfill wbs_stage on inventory_transactions and goods_issues

DO $$ 
DECLARE
  has_wbs_id BOOLEAN;
  has_wbs_cat BOOLEAN;
BEGIN 
  -- 1. Perbarui tabel inventory_transactions jika ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN 
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS wbs_stage TEXT;  
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
    UPDATE public.inventory_transactions SET created_at = issued_at WHERE created_at IS NULL;

    -- Sinkronkan wbs_stage dari material_requisition_items jika tersedia
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisition_items' AND column_name = 'wbs_stage') THEN
      UPDATE public.inventory_transactions it 
      SET wbs_stage = mri.wbs_stage 
      FROM public.material_requisition_items mri 
      WHERE it.requisition_item_id = mri.id 
        AND mri.wbs_stage IS NOT NULL AND mri.wbs_stage <> ''
        AND (it.wbs_stage IS NULL OR it.wbs_stage = '');
    END IF;

    -- Sinkronkan wbs_stage dari material_requisitions (wbs_id atau wbs_category)
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisitions' AND column_name = 'wbs_id') INTO has_wbs_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisitions' AND column_name = 'wbs_category') INTO has_wbs_cat;

    IF has_wbs_id THEN
      EXECUTE '
        UPDATE public.inventory_transactions it 
        SET wbs_stage = mr.wbs_id::text 
        FROM public.material_requisition_items mri 
        JOIN public.material_requisitions mr ON mr.id = mri.requisition_id 
        WHERE it.requisition_item_id = mri.id 
          AND mr.wbs_id IS NOT NULL
          AND (it.wbs_stage IS NULL OR it.wbs_stage = '''')
      ';
    END IF;

    IF has_wbs_cat THEN
      EXECUTE '
        UPDATE public.inventory_transactions it 
        SET wbs_stage = mr.wbs_category::text 
        FROM public.material_requisition_items mri 
        JOIN public.material_requisitions mr ON mr.id = mri.requisition_id 
        WHERE it.requisition_item_id = mri.id 
          AND mr.wbs_category IS NOT NULL
          AND (it.wbs_stage IS NULL OR it.wbs_stage = '''')
      ';
    END IF;

    -- Sinkronkan fallback dari rab_items (wbs_category / wbs_stage via rab_estimations)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'wbs_category') THEN
      UPDATE public.inventory_transactions it 
      SET wbs_stage = ri.wbs_category::text 
      FROM public.rab_estimations re 
      JOIN public.rab_items ri ON ri.rab_estimation_id = re.id 
      WHERE it.spk_id = re.spk_id 
        AND it.material_id = ri.material_id 
        AND ri.wbs_category IS NOT NULL
        AND (it.wbs_stage IS NULL OR it.wbs_stage = ''); 
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'wbs_stage') THEN
      UPDATE public.inventory_transactions it 
      SET wbs_stage = ri.wbs_stage 
      FROM public.rab_estimations re 
      JOIN public.rab_items ri ON ri.rab_estimation_id = re.id 
      WHERE it.spk_id = re.spk_id 
        AND it.material_id = ri.material_id 
        AND ri.wbs_stage IS NOT NULL AND ri.wbs_stage <> ''
        AND (it.wbs_stage IS NULL OR it.wbs_stage = ''); 
    END IF;

    -- Fallback jika rab_items memiliki spk_id langsung
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'spk_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'wbs_category') THEN
        EXECUTE '
          UPDATE public.inventory_transactions it 
          SET wbs_stage = ri.wbs_category::text 
          FROM public.rab_items ri 
          WHERE it.spk_id = ri.spk_id 
            AND it.material_id = ri.material_id 
            AND ri.wbs_category IS NOT NULL
            AND (it.wbs_stage IS NULL OR it.wbs_stage = '''')
        ';
      END IF;
    END IF;
  END IF;        

  -- 2. Perbarui tabel goods_issues jika ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goods_issues') THEN 
    ALTER TABLE public.goods_issues ADD COLUMN IF NOT EXISTS wbs_stage TEXT;          

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisition_items' AND column_name = 'wbs_stage') THEN
      UPDATE public.goods_issues gi 
      SET wbs_stage = mri.wbs_stage 
      FROM public.material_requisition_items mri 
      WHERE gi.requisition_item_id = mri.id 
        AND mri.wbs_stage IS NOT NULL AND mri.wbs_stage <> ''
        AND (gi.wbs_stage IS NULL OR gi.wbs_stage = '');
    END IF;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisitions' AND column_name = 'wbs_id') INTO has_wbs_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'material_requisitions' AND column_name = 'wbs_category') INTO has_wbs_cat;

    IF has_wbs_id THEN
      EXECUTE '
        UPDATE public.goods_issues gi 
        SET wbs_stage = mr.wbs_id::text 
        FROM public.material_requisition_items mri 
        JOIN public.material_requisitions mr ON mr.id = mri.requisition_id 
        WHERE gi.requisition_item_id = mri.id 
          AND mr.wbs_id IS NOT NULL
          AND (gi.wbs_stage IS NULL OR gi.wbs_stage = '''')
      ';
    END IF;

    IF has_wbs_cat THEN
      EXECUTE '
        UPDATE public.goods_issues gi 
        SET wbs_stage = mr.wbs_category::text 
        FROM public.material_requisition_items mri 
        JOIN public.material_requisitions mr ON mr.id = mri.requisition_id 
        WHERE gi.requisition_item_id = mri.id 
          AND mr.wbs_category IS NOT NULL
          AND (gi.wbs_stage IS NULL OR gi.wbs_stage = '''')
      ';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rab_items' AND column_name = 'wbs_category') THEN
      UPDATE public.goods_issues gi 
      SET wbs_stage = ri.wbs_category::text 
      FROM public.rab_estimations re 
      JOIN public.rab_items ri ON ri.rab_estimation_id = re.id 
      WHERE gi.spk_id = re.spk_id 
        AND gi.material_id = ri.material_id 
        AND ri.wbs_category IS NOT NULL
        AND (gi.wbs_stage IS NULL OR gi.wbs_stage = '');
    END IF;
  END IF; 
END $$;
