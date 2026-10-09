-- Allow Service Advisor to manage wbs_checklists
CREATE POLICY "Service Advisors have full access to wbs_checklists"
  ON public.wbs_checklists FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor' );
