-- Add hero section customization fields to profiles
ALTER TABLE public.profiles
ADD COLUMN hero_enabled BOOLEAN DEFAULT true,
ADD COLUMN hero_button_text TEXT DEFAULT 'Agendar agora mesmo',
ADD COLUMN hero_button_color TEXT DEFAULT '#D97706';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hero_enabled IS 'Whether to show the hero welcome page before booking';
COMMENT ON COLUMN public.profiles.hero_button_text IS 'Custom text for the hero CTA button';
COMMENT ON COLUMN public.profiles.hero_button_color IS 'Custom color for the hero CTA button';