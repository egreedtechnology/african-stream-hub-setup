-- Set search_path on functions and revoke public execute on SECURITY DEFINER funcs
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.mark_comment_edited() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;