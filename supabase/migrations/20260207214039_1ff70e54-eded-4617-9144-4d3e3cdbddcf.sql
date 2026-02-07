-- Add break tolerance columns to barber_schedules
ALTER TABLE public.barber_schedules 
  ADD COLUMN IF NOT EXISTS break_tolerance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS break_tolerance_minutes integer NOT NULL DEFAULT 0;