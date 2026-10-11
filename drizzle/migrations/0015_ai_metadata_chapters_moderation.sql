ALTER TABLE public.video_ai_metadata
  ADD COLUMN IF NOT EXISTS chapters JSONB,
  ADD COLUMN IF NOT EXISTS moderation JSONB,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT;

CREATE INDEX IF NOT EXISTS idx_video_ai_metadata_moderation_status
  ON public.video_ai_metadata (moderation_status);