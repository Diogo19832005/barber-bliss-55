-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add barber_status field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS barber_status TEXT DEFAULT 'pending' 
CHECK (barber_status IN ('pending', 'approved', 'rejected'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_barber_status ON public.profiles(barber_status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin (using auth.uid())
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
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

-- RLS policies for user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Update handle_new_user to set barber_status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, barber_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client') = 'barber' THEN 'pending'
      ELSE 'approved'
    END
  );
  RETURN NEW;
END;
$$;

-- Update trigger to only generate public link for APPROVED barbers
CREATE OR REPLACE FUNCTION public.generate_barber_public_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate for APPROVED barbers and when public_id is not set
  IF NEW.role = 'barber' AND NEW.barber_status = 'approved' AND NEW.public_id IS NULL THEN
    NEW.public_id := public.get_next_public_id();
    NEW.slug_nome := public.generate_slug(NEW.full_name);
    NEW.slug_final := NEW.slug_nome || NEW.public_id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

-- Update trigger for when barber gets approved
CREATE OR REPLACE FUNCTION public.generate_barber_public_link_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate link when barber is approved and doesn't have public_id yet
  IF NEW.role = 'barber' AND NEW.barber_status = 'approved' AND NEW.public_id IS NULL THEN
    NEW.public_id := public.get_next_public_id();
    NEW.slug_nome := public.generate_slug(NEW.full_name);
    NEW.slug_final := NEW.slug_nome || NEW.public_id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

-- Insert the main admin (will be executed when admin first signs up)
-- Create function to auto-add admin role for specific email
CREATE OR REPLACE FUNCTION public.auto_add_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is the main admin email
  IF NEW.email = 'diogodossantoszz476@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-add admin role on user creation
DROP TRIGGER IF EXISTS trigger_auto_add_admin_role ON auth.users;
CREATE TRIGGER trigger_auto_add_admin_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_admin_role();