-- Add address fields to profiles for barbers
ALTER TABLE public.profiles
ADD COLUMN endereco TEXT,
ADD COLUMN cidade TEXT,
ADD COLUMN estado TEXT;