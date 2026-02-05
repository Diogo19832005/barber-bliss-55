-- Add bio and gallery fields to profiles for barber presentation
ALTER TABLE public.profiles
ADD COLUMN bio text DEFAULT NULL,
ADD COLUMN foto_apresentacao text DEFAULT NULL;

-- Create a table for barber gallery images
CREATE TABLE public.barber_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barber_gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery images
CREATE POLICY "Anyone can view gallery images"
ON public.barber_gallery
FOR SELECT
USING (true);

-- Barbers can manage their own gallery
CREATE POLICY "Barbers can manage own gallery"
ON public.barber_gallery
FOR ALL
USING (
  barber_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery bucket
CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own gallery images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);