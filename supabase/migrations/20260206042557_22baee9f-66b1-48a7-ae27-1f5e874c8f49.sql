
-- Fix the function to set the search_path for security
CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's any overlapping appointment for the same barber on the same date
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE barber_id = NEW.barber_id
      AND appointment_date = NEW.appointment_date
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        -- New appointment starts during an existing one
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        -- New appointment ends during an existing one
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        -- New appointment completely contains an existing one
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Horário indisponível: já existe um agendamento neste período';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
