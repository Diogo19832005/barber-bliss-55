
-- Add fields to appointments for barber-created appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text;

-- Make client_id nullable for walk-in clients
ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;

-- Allow barbers to insert appointments
CREATE POLICY "Barbers can create appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    barber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Allow barbers to view appointments they created (even without client_id match)
CREATE POLICY "Barbers can view appointments they created"
  ON public.appointments
  FOR SELECT
  USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );
