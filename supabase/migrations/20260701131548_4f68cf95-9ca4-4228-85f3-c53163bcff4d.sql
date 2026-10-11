
-- Fix has_role enumeration: only allow checking own role, or if caller is admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF _user_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Restrict for_you_feed to authenticated only (was granted to PUBLIC/anon)
REVOKE EXECUTE ON FUNCTION public.for_you_feed(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.for_you_feed(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.for_you_feed(uuid, integer) TO authenticated;
