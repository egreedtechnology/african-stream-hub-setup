-- Time-stamped view events so trending can use a rolling window
CREATE TABLE IF NOT EXISTS public.video_view_events (
  id BIGSERIAL PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS video_view_events_recent_idx ON public.video_view_events (created_at DESC, video_id);

GRANT INSERT ON public.video_view_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.video_view_events_id_seq TO anon, authenticated;
GRANT ALL ON public.video_view_events TO service_role;
ALTER TABLE public.video_view_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can record a view" ON public.video_view_events;
CREATE POLICY "Anyone can record a view" ON public.video_view_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Computed trending ranking, refreshed on a schedule
CREATE TABLE IF NOT EXISTS public.trending_scores (
  video_id UUID PRIMARY KEY REFERENCES public.videos(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  rank INT NOT NULL,
  window_hours INT NOT NULL DEFAULT 48,
  recent_views INT NOT NULL DEFAULT 0,
  recent_likes INT NOT NULL DEFAULT 0,
  recent_comments INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trending_scores_rank_idx ON public.trending_scores (rank);

GRANT SELECT ON public.trending_scores TO anon, authenticated;
GRANT ALL ON public.trending_scores TO service_role;
ALTER TABLE public.trending_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trending is public" ON public.trending_scores;
CREATE POLICY "Trending is public" ON public.trending_scores FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.refresh_trending(_window_hours INT DEFAULT 48, _limit INT DEFAULT 60)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff TIMESTAMPTZ := now() - make_interval(hours => _window_hours);
  _count INT;
BEGIN
  CREATE TEMP TABLE _new_trending ON COMMIT DROP AS
  WITH base AS (
    SELECT v.id,
           v.views,
           v.created_at,
           COALESCE((SELECT count(*) FROM public.video_view_events e WHERE e.video_id = v.id AND e.created_at >= _cutoff), 0) AS rv,
           COALESCE((SELECT count(*) FROM public.video_likes l WHERE l.video_id = v.id AND l.created_at >= _cutoff), 0) AS rl,
           COALESCE((SELECT count(*) FROM public.comments c WHERE c.video_id = v.id AND c.created_at >= _cutoff), 0) AS rc
    FROM public.videos v
    WHERE v.visibility = 'public' AND v.status = 'ready'
  ), scored AS (
    SELECT id, rv, rl, rc,
           (rv * 1.0 + rl * 4.0 + rc * 6.0
             + COALESCE(views, 0) * 0.02
             + CASE WHEN created_at >= _cutoff THEN 15 ELSE 0 END)
           / POWER(2 + EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0, 0.4) AS score
    FROM base
  )
  SELECT id AS video_id, score, rv, rl, rc,
         ROW_NUMBER() OVER (ORDER BY score DESC, id) AS rank
  FROM scored
  ORDER BY score DESC
  LIMIT _limit;

  DELETE FROM public.trending_scores t WHERE NOT EXISTS (SELECT 1 FROM _new_trending n WHERE n.video_id = t.video_id);

  INSERT INTO public.trending_scores (video_id, score, rank, window_hours, recent_views, recent_likes, recent_comments, computed_at)
  SELECT video_id, score, rank, _window_hours, rv, rl, rc, now() FROM _new_trending
  ON CONFLICT (video_id) DO UPDATE
    SET score = EXCLUDED.score,
        rank = EXCLUDED.rank,
        window_hours = EXCLUDED.window_hours,
        recent_views = EXCLUDED.recent_views,
        recent_likes = EXCLUDED.recent_likes,
        recent_comments = EXCLUDED.recent_comments,
        computed_at = EXCLUDED.computed_at;

  SELECT count(*) INTO _count FROM _new_trending;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_trending(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_trending(INT, INT) TO service_role;