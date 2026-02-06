
-- Allow barbershop admins to view appointments of their team members
CREATE POLICY "Barbershop admins can view team appointments"
ON public.appointments
FOR SELECT
USING (
  barber_id IN (
    SELECT p.id
    FROM profiles p
    WHERE p.barbershop_owner_id IS NOT NULL
      AND is_barbershop_admin_of(p.barbershop_owner_id)
  )
);
