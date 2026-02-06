
-- Function to get user email by user_id (admin only)
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT email INTO found_email
  FROM auth.users
  WHERE id = target_user_id;

  RETURN found_email;
END;
$$;
