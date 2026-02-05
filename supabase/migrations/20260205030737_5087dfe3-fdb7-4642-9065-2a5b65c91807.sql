-- Fix search_path for generate_slug function
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

-- Move unaccent extension to a dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Update generate_slug to use extensions schema
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase, remove accents, and replace spaces/special chars
  slug := lower(extensions.unaccent(name));
  -- Remove all non-alphanumeric characters
  slug := regexp_replace(slug, '[^a-z0-9]', '', 'g');
  RETURN slug;
END;
$$;