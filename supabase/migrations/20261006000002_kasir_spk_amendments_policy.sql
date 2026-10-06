CREATE POLICY "Kasir can read SPK Amendments"
  ON public.spk_amendments FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kasir' );
