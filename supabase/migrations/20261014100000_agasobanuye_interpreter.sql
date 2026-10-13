-- name: 20261014100000_agasobanuye_interpreter.sql
ALTER TABLE public.videos 
  ADD COLUMN IF NOT EXISTS interpreter TEXT,
  ADD COLUMN IF NOT EXISTS part_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_parts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kinyarwanda_synopsis TEXT;

CREATE INDEX IF NOT EXISTS idx_videos_interpreter ON public.videos (interpreter);
CREATE INDEX IF NOT EXISTS idx_videos_agasobanuye ON public.videos (has_agasobanuye) WHERE has_agasobanuye = true;
