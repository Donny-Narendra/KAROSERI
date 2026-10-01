-- ==============================================================================
-- 1. Create spk-assets storage bucket
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('spk-assets', 'spk-assets', false)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. Storage RLS Policies
-- ==============================================================================
-- Service Advisors and Owners can upload files to the spk-assets bucket
CREATE POLICY "Allow authenticated uploads to spk-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'spk-assets' 
    AND auth.role() = 'authenticated'
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor'
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
  );

-- Service Advisors and Owners can read files from the spk-assets bucket
CREATE POLICY "Allow authenticated reads from spk-assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'spk-assets'
    AND auth.role() = 'authenticated'
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'service_advisor'
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
    )
  );
