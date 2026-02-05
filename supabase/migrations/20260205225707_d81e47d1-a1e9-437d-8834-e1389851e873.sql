-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Barbershop admins can view team members" ON public.profiles;
DROP POLICY IF EXISTS "Barbershop admins can update team members" ON public.profiles;

-- Create a SECURITY DEFINER function to check if user is a barbershop admin
-- This avoids RLS recursion by bypassing RLS during the check
CREATE OR REPLACE FUNCTION public.is_barbershop_admin_of(team_member_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND id = team_member_owner_id
      AND is_barbershop_admin = true
  )
$$;

-- Create a function to get the current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Recreate policies using the SECURITY DEFINER functions to avoid recursion
CREATE POLICY "Barbershop admins can view team members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  barbershop_owner_id IS NOT NULL 
  AND public.is_barbershop_admin_of(barbershop_owner_id)
);

CREATE POLICY "Barbershop admins can update team members"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  barbershop_owner_id IS NOT NULL 
  AND public.is_barbershop_admin_of(barbershop_owner_id)
)
WITH CHECK (
  barbershop_owner_id IS NOT NULL 
  AND public.is_barbershop_admin_of(barbershop_owner_id)
);