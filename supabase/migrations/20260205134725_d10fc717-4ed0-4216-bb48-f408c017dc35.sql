-- Create function to get user_id by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  -- Only allow admins to use this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT id INTO found_user_id
  FROM auth.users
  WHERE email = lower(email_input);

  RETURN found_user_id;
END;
$$;