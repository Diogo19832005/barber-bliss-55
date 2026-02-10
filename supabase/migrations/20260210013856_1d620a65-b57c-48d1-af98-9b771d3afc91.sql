
CREATE TABLE public.barber_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.barber_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials" ON public.barber_testimonials FOR SELECT USING (true);

CREATE POLICY "Barbers can manage own testimonials" ON public.barber_testimonials FOR ALL USING (
  barber_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
);
