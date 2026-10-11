-- 1) media_type enum + column on videos
DO $$ BEGIN
  CREATE TYPE public.media_type AS ENUM ('video', 'audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS media_type public.media_type NOT NULL DEFAULT 'video';

CREATE INDEX IF NOT EXISTS idx_videos_owner_created
  ON public.videos (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_videos_created
  ON public.videos (created_at DESC);

-- 2) follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone"
  ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);