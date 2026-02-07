-- Add break columns to barber_schedules
ALTER TABLE public.barber_schedules 
  ADD COLUMN IF NOT EXISTS has_break boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS break_start time without time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS break_end time without time zone DEFAULT NULL;