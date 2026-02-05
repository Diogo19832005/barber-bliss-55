-- Add public link fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS public_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS slug_nome TEXT,
ADD COLUMN IF NOT EXISTS slug_final TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug_final ON public.profiles(slug_final);
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase, remove accents, and replace spaces/special chars
  slug := lower(unaccent(name));
  -- Remove all non-alphanumeric characters
  slug := regexp_replace(slug, '[^a-z0-9]', '', 'g');
  RETURN slug;
END;
$$;

-- Create function to generate next public_id (starting at 1010)
CREATE OR REPLACE FUNCTION public.get_next_public_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(public_id), 1009) INTO max_id FROM public.profiles WHERE role = 'barber';
  RETURN max_id + 1;
END;
$$;

-- Create trigger function to auto-generate public link fields for barbers
CREATE OR REPLACE FUNCTION public.generate_barber_public_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate for barbers and when public_id is not set
  IF NEW.role = 'barber' AND NEW.public_id IS NULL THEN
    NEW.public_id := public.get_next_public_id();
    NEW.slug_nome := public.generate_slug(NEW.full_name);
    NEW.slug_final := NEW.slug_nome || NEW.public_id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger that runs before insert
DROP TRIGGER IF EXISTS trigger_generate_barber_public_link ON public.profiles;
CREATE TRIGGER trigger_generate_barber_public_link
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_barber_public_link();

-- Also handle updates (in case role changes to barber)
CREATE OR REPLACE FUNCTION public.generate_barber_public_link_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate for barbers when changing to barber role and public_id is not set
  IF NEW.role = 'barber' AND NEW.public_id IS NULL AND (OLD.role != 'barber' OR OLD.role IS NULL) THEN
    NEW.public_id := public.get_next_public_id();
    NEW.slug_nome := public.generate_slug(NEW.full_name);
    NEW.slug_final := NEW.slug_nome || NEW.public_id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_barber_public_link_update ON public.profiles;
CREATE TRIGGER trigger_generate_barber_public_link_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_barber_public_link_on_update();

-- Enable unaccent extension for slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;