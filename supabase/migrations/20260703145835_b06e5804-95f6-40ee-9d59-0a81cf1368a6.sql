
REVOKE EXECUTE ON FUNCTION public.match_videos(extensions.vector, integer, double precision) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_follower_count(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_videos(extensions.vector, integer, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_follower_count(uuid) TO authenticated;

DROP POLICY IF EXISTS "Public can view candidates for public videos" ON public.thumbnail_candidates;

DROP POLICY IF EXISTS "Authenticated upload captions" ON storage.objects;
CREATE POLICY "Authenticated upload captions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'captions'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Public read captions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read captions" ON storage.objects;
CREATE POLICY "Authenticated read captions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'captions'
  AND (
    owner = auth.uid()
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.video_captions vc
      JOIN public.videos v ON v.id = vc.video_id
      WHERE storage.objects.name = split_part(vc.vtt_url, '/captions/', 2)
        AND v.visibility = 'public'
        AND v.status = 'ready'
    )
  )
);
