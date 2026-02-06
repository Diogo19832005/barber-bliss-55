
-- Create function to check if user is a chief admin (role = 'admin')
CREATE OR REPLACE FUNCTION public.is_chief_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Update is_admin to include collaborator_admin too
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'collaborator_admin')
  );
END;
$$;

-- Update RLS: allow chief admins to insert user_roles
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Chief admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_chief_admin());

-- Update RLS: allow chief admins to delete user_roles
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Chief admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.is_chief_admin());

-- Allow admins (both types) to view user_roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin());

-- Allow chief admins to update user_roles (to change role type)
CREATE POLICY "Chief admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.is_chief_admin());
