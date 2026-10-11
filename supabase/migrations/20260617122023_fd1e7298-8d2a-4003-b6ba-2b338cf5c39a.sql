REVOKE INSERT, UPDATE, DELETE ON public.videos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.comments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.video_likes FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.follows FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.video_progress FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

GRANT SELECT ON public.videos TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.video_likes TO anon;
GRANT SELECT ON public.follows TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_progress TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT ALL ON public.videos TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.comments TO service_role;
GRANT ALL ON public.video_likes TO service_role;
GRANT ALL ON public.follows TO service_role;
GRANT ALL ON public.video_progress TO service_role;
GRANT ALL ON public.user_roles TO service_role;