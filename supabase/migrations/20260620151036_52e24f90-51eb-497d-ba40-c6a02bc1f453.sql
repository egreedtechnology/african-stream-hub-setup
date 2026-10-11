
-- Public read for caption VTT files (workspace blocks public buckets, so we expose via RLS)
CREATE POLICY "Public read captions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'captions');

CREATE POLICY "Authenticated upload captions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'captions');

CREATE POLICY "Authenticated update own captions"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'captions' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'captions' AND owner = auth.uid());

CREATE POLICY "Authenticated delete own captions"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'captions' AND owner = auth.uid());
