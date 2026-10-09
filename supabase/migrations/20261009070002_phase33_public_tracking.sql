-- Allow public (anon) to read SPK for tracking if status is not DRAFT and DP > 0
CREATE POLICY "Allow public to read active SPK"
  ON public.spk FOR SELECT
  USING ( status != 'DRAFT' AND dp_amount > 0 );

-- Allow public to read WBS checklists if SPK is active
CREATE POLICY "Allow public to read WBS checklists"
  ON public.wbs_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spk
      WHERE id = spk_id AND status != 'DRAFT' AND dp_amount > 0
    )
  );

-- Allow public to read SPK assets (photos) if SPK is active
CREATE POLICY "Allow public to read SPK assets"
  ON public.spk_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spk
      WHERE id = spk_id AND status != 'DRAFT' AND dp_amount > 0
    )
  );
