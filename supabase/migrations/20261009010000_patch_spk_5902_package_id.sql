-- Patch script for SPK-5902 to link DUDUKAN SLEBOR package
UPDATE public.rab_items
SET package_id = 'a32ab8ed-c7d1-4212-808f-46359e36e377'
WHERE rab_estimation_id = (
  SELECT id FROM public.rab_estimations
  WHERE spk_id = (
    SELECT id FROM public.spk
    WHERE spk_no = 'SPK-5902'
  )
);
