-- Migration: 20261024050000_deduplicate_rab_items.sql
-- Goal: Bersihkan duplikasi rab_items secara menyeluruh akibat eksekusi ganda batch insert / auto-save

DELETE FROM public.rab_items
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               rab_estimation_id,
               COALESCE(package_id::text, ''),
               COALESCE(material_id::text, ''),
               COALESCE(description, ''),
               COALESCE(wbs_category, ''),
               COALESCE(item_type, ''),
               quantity,
               unit_price,
               cost_price
             ORDER BY created_at ASC, id ASC
           ) AS rnum
    FROM public.rab_items
  ) dup
  WHERE dup.rnum > 1
);
