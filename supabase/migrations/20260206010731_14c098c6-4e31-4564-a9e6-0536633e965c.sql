-- Add dashboard home preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dashboard_home_widgets jsonb DEFAULT '["today_appointments", "upcoming_appointments", "services"]'::jsonb;