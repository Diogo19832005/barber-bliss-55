-- Add hero animation speed field to profiles
ALTER TABLE public.profiles
ADD COLUMN hero_animation_speed numeric DEFAULT 1.0;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.hero_animation_speed IS 'Speed multiplier for hero button pulse animation. Lower = faster (0.2 = very fast, 1.0 = normal)';