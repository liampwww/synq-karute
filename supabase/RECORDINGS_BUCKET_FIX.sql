-- =============================================================================
-- Recordings bucket fix — run this if "録音の保存に失敗しました" when saving
-- Supabase Dashboard → SQL Editor → paste → Run
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('recordings', 'recordings', false, 104857600)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Staff can download org recordings" ON storage.objects;

CREATE POLICY "Staff can upload recordings"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can download org recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.staff WHERE user_id = auth.uid()
    )
  );
