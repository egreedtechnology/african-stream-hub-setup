
-- Restrict public enumeration of video_likes and follows.

-- video_likes: only the owner of the row can SELECT
DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.video_likes;
CREATE POLICY "Users read own likes" ON public.video_likes
  FOR SELECT USING (auth.uid() = user_id);

-- follows: only participants can SELECT raw rows
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Participants read follows" ON public.follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Provide a public follower-count RPC so the UI can still show counts
-- without exposing the full social graph.
CREATE OR REPLACE FUNCTION public.get_follower_count(_creator uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.follows WHERE following_id = _creator;
$$;

REVOKE ALL ON FUNCTION public.get_follower_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_follower_count(uuid) TO anon, authenticated;
