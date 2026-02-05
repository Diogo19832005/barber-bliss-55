-- Add barbershop hierarchy fields to profiles
ALTER TABLE public.profiles
ADD COLUMN barbershop_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN is_barbershop_admin BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX idx_profiles_barbershop_owner ON public.profiles(barbershop_owner_id);

-- Update existing approved barbers to be barbershop admins by default
UPDATE public.profiles 
SET is_barbershop_admin = true 
WHERE role = 'barber' AND barber_status = 'approved' AND barbershop_owner_id IS NULL;

-- RLS policy: Barbershop admins can view their team members
CREATE POLICY "Barbershop admins can view team members"
ON public.profiles
FOR SELECT
USING (
  barbershop_owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND is_barbershop_admin = true
  )
);

-- RLS policy: Barbershop admins can update team member profiles (limited fields)
CREATE POLICY "Barbershop admins can update team members"
ON public.profiles
FOR UPDATE
USING (
  barbershop_owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND is_barbershop_admin = true
  )
)
WITH CHECK (
  barbershop_owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND is_barbershop_admin = true
  )
);

-- Update services policy to allow barbershop admin to manage all team services
DROP POLICY IF EXISTS "Barbers can manage own services" ON public.services;

CREATE POLICY "Barbers can manage own services"
ON public.services
FOR ALL
USING (
  barber_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  barber_id IN (
    SELECT p.id FROM profiles p
    INNER JOIN profiles admin ON p.barbershop_owner_id = admin.id
    WHERE admin.user_id = auth.uid() AND admin.is_barbershop_admin = true
  )
);

-- Update barber_schedules policy similarly
DROP POLICY IF EXISTS "Barbers can manage own schedules" ON public.barber_schedules;

CREATE POLICY "Barbers can manage own schedules"
ON public.barber_schedules
FOR ALL
USING (
  barber_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
  OR
  barber_id IN (
    SELECT p.id FROM profiles p
    INNER JOIN profiles admin ON p.barbershop_owner_id = admin.id
    WHERE admin.user_id = auth.uid() AND admin.is_barbershop_admin = true
  )
);