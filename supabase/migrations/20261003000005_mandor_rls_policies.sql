-- Mandor needs to be able to read SPK data for the Mandor Terminal
CREATE POLICY "Mandor can read spk"
  ON public.spk FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'mandor' );
