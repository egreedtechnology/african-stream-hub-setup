
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS keywords text;

CREATE INDEX IF NOT EXISTS videos_tags_gin ON public.videos USING gin (tags);
CREATE INDEX IF NOT EXISTS videos_country_idx ON public.videos (country);
CREATE INDEX IF NOT EXISTS videos_keywords_trgm ON public.videos USING gin (keywords extensions.gin_trgm_ops);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_language text;

CREATE TABLE IF NOT EXISTS public.thumbnail_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  url text NOT NULL,
  source text NOT NULL CHECK (source IN ('frame','ai','custom')),
  position int NOT NULL DEFAULT 0,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thumbnail_candidates TO authenticated;
GRANT SELECT ON public.thumbnail_candidates TO anon;
GRANT ALL ON public.thumbnail_candidates TO service_role;

ALTER TABLE public.thumbnail_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view candidates for public videos" ON public.thumbnail_candidates;
CREATE POLICY "Public can view candidates for public videos"
  ON public.thumbnail_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = thumbnail_candidates.video_id
        AND (v.visibility = 'public' OR v.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners manage their candidates" ON public.thumbnail_candidates;
CREATE POLICY "Owners manage their candidates"
  ON public.thumbnail_candidates FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS thumb_cand_video_idx ON public.thumbnail_candidates (video_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='video_embeddings_emb_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX video_embeddings_emb_hnsw ON public.video_embeddings USING hnsw (embedding extensions.vector_cosine_ops)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.match_videos(
  query_embedding extensions.vector,
  match_count int DEFAULT 20,
  min_similarity float DEFAULT 0.2
)
RETURNS TABLE (video_id uuid, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    e.video_id,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.video_embeddings e
  JOIN public.videos v ON v.id = e.video_id
  WHERE v.visibility = 'public' AND v.status = 'ready'
    AND (1 - (e.embedding <=> query_embedding)) >= min_similarity
  ORDER BY e.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_videos(extensions.vector, int, float) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.for_you_feed(
  _user_id uuid,
  _limit int DEFAULT 30
)
RETURNS TABLE (video_id uuid, score float)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  pref_lang text;
  pref_country text;
BEGIN
  SELECT p.preferred_language, p.country INTO pref_lang, pref_country
  FROM public.profiles p WHERE p.id = _user_id;

  RETURN QUERY
  WITH recent AS (
    SELECT vp.video_id
    FROM public.video_progress vp
    WHERE vp.user_id = _user_id AND vp.position_seconds > 10
    ORDER BY vp.updated_at DESC LIMIT 20
  ),
  centroid AS (
    SELECT AVG(e.embedding)::extensions.vector AS emb
    FROM public.video_embeddings e
    WHERE e.video_id IN (SELECT video_id FROM recent)
  ),
  cat_aff AS (
    SELECT v.category, COUNT(*)::float AS cnt
    FROM public.video_progress vp
    JOIN public.videos v ON v.id = vp.video_id
    WHERE vp.user_id = _user_id
    GROUP BY v.category
  ),
  total AS (SELECT GREATEST(SUM(cnt), 1) AS s FROM cat_aff)
  SELECT
    v.id AS video_id,
    (
      COALESCE(0.55 * (1 - (e.embedding <=> (SELECT emb FROM centroid))), 0)
      + CASE WHEN pref_lang IS NOT NULL AND v.language = pref_lang THEN 0.15 ELSE 0 END
      + CASE WHEN pref_country IS NOT NULL AND v.country = pref_country THEN 0.10 ELSE 0 END
      + COALESCE((SELECT 0.10 * (ca.cnt / (SELECT s FROM total)) FROM cat_aff ca WHERE ca.category = v.category), 0)
      + LEAST(0.10, LN(GREATEST(v.views, 1)) / 30.0)
    )::float AS score
  FROM public.videos v
  LEFT JOIN public.video_embeddings e ON e.video_id = v.id
  WHERE v.visibility = 'public' AND v.status = 'ready'
    AND v.id NOT IN (SELECT video_id FROM recent)
  ORDER BY score DESC NULLS LAST
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.for_you_feed(uuid, int) TO authenticated, service_role;
