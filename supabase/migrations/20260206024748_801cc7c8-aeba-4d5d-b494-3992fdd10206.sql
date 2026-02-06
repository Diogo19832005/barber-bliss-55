-- Add country field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'BR';