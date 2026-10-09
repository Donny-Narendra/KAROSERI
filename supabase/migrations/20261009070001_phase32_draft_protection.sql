-- Block INSERT and UPDATE on wbs_checklists for DRAFT SPK
CREATE POLICY "Restrict INSERT wbs_checklists on DRAFT SPK"
  ON public.wbs_checklists
  AS RESTRICTIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  );

CREATE POLICY "Restrict UPDATE wbs_checklists on DRAFT SPK"
  ON public.wbs_checklists
  AS RESTRICTIVE
  FOR UPDATE
  TO PUBLIC
  USING (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  )
  WITH CHECK (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  );

-- Block INSERT and UPDATE on qc_inspections for DRAFT SPK
CREATE POLICY "Restrict INSERT qc_inspections on DRAFT SPK"
  ON public.qc_inspections
  AS RESTRICTIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  );

CREATE POLICY "Restrict UPDATE qc_inspections on DRAFT SPK"
  ON public.qc_inspections
  AS RESTRICTIVE
  FOR UPDATE
  TO PUBLIC
  USING (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  )
  WITH CHECK (
    (SELECT status FROM public.spk WHERE id = spk_id) != 'DRAFT'
  );
