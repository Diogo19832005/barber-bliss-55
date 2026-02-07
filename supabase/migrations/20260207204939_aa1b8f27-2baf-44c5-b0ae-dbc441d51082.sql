-- Enable realtime for appointments table so clients see updated slots
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;