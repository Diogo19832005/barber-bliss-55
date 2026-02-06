-- Add services section title to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hero_services_title text DEFAULT 'Meus Serviços';