-- 1. RLS на agency_profiles
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_profiles_select_public"
  ON public.agency_profiles FOR SELECT USING (true);

CREATE POLICY "agency_profiles_select_owner"
  ON public.agency_profiles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "agency_profiles_insert_owner"
  ON public.agency_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agency_profiles_update_owner"
  ON public.agency_profiles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Storage bucket agency-logos (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-logos',
  'agency-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage policies для agency-logos
CREATE POLICY "agency_logos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-logos');

CREATE POLICY "agency_logos_insert_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "agency_logos_update_owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agency-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "agency_logos_delete_owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agency-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
