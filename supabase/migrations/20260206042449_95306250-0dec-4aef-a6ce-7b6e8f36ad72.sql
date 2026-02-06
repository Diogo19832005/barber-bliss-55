
-- First, let's clean up the duplicate appointments (keep the first one created)
DELETE FROM public.appointments a
WHERE a.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY barber_id, appointment_date, start_time 
             ORDER BY created_at ASC
           ) as rn
    FROM public.appointments
    WHERE status != 'cancelled'
  ) sub
  WHERE rn > 1
);

-- Create a unique partial index to prevent double-booking at the database level
-- This ensures no two non-cancelled appointments can have the same barber, date, and start time
CREATE UNIQUE INDEX unique_barber_appointment_slot 
ON public.appointments (barber_id, appointment_date, start_time)
WHERE status != 'cancelled';

-- Also create a function to check for time overlap conflicts
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
$$ LANGUAGE plpgsql;

-- Create trigger to check for overlaps before insert or update
DROP TRIGGER IF EXISTS check_appointment_overlap_trigger ON public.appointments;
CREATE TRIGGER check_appointment_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_overlap();
