-- Add material_id and rab_item_id to spk_borongan for tracking allocated items from RAB
ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;
ALTER TABLE public.spk_borongan ADD COLUMN IF NOT EXISTS rab_item_id uuid REFERENCES public.rab_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_spk_borongan_material_id ON public.spk_borongan(material_id);
CREATE INDEX IF NOT EXISTS idx_spk_borongan_rab_item_id ON public.spk_borongan(rab_item_id);

-- Backfill existing spk_borongan item tracking for known SPK and matching descriptions
DO $$
DECLARE
  rec RECORD;
  matched_rab_id uuid;
  matched_mat_id uuid;
BEGIN
  FOR rec IN SELECT id, spk_id, task_description FROM public.spk_borongan WHERE rab_item_id IS NULL AND task_description IS NOT NULL LOOP
    SELECT ri.id, ri.material_id 
    INTO matched_rab_id, matched_mat_id
    FROM public.rab_items ri
    JOIN public.rab_estimations re ON ri.rab_estimation_id = re.id
    WHERE re.spk_id = rec.spk_id
      AND (
        (ri.description IS NOT NULL AND TRIM(ri.description) <> '' AND LOWER(rec.task_description) LIKE '%' || LOWER(TRIM(ri.description)) || '%')
        OR
        (rec.task_description ILIKE '%' || LOWER(TRIM(COALESCE(ri.description, ''))) || '%')
      )
    LIMIT 1;

    IF matched_rab_id IS NOT NULL THEN
      UPDATE public.spk_borongan 
      SET rab_item_id = matched_rab_id,
          material_id = COALESCE(material_id, matched_mat_id)
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
