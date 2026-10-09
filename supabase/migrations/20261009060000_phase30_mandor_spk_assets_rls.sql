-- Allow Mandor to manage spk_assets for WBS gallery
CREATE POLICY "Mandor can read spk_assets"
  ON public.spk_assets FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can insert spk_assets"
  ON public.spk_assets FOR INSERT
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );

CREATE POLICY "Mandor can delete spk_assets"
  ON public.spk_assets FOR DELETE
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );
