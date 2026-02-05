-- Add image_url column to services table
ALTER TABLE public.services ADD COLUMN image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.services.image_url IS 'URL of the service image stored in Supabase storage';