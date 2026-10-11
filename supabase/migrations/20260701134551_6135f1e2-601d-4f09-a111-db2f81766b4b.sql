
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS ai_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS thumbnail_generation_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.thumbnail_candidates
  ADD COLUMN IF NOT EXISTS score double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS timestamp_seconds double precision;

CREATE INDEX IF NOT EXISTS idx_thumbnail_candidates_video_score
  ON public.thumbnail_candidates(video_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_videos_thumbnail_status
  ON public.videos(thumbnail_generation_status)
  WHERE thumbnail_generation_status <> 'done';
