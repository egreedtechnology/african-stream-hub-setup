
-- Likes table for videos/audio (shared model)
CREATE TABLE IF NOT EXISTS public.video_likes (
  video_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by everyone" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

-- Keep videos.likes count in sync via triggers
CREATE OR REPLACE FUNCTION public.bump_video_like_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes = likes + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes = GREATEST(0, likes - 1) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_video_likes_ins ON public.video_likes;
CREATE TRIGGER trg_video_likes_ins AFTER INSERT ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_video_like_count();

DROP TRIGGER IF EXISTS trg_video_likes_del ON public.video_likes;
CREATE TRIGGER trg_video_likes_del AFTER DELETE ON public.video_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_video_like_count();
