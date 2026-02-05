-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public viewing of service images
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- Policy for barbers to upload their service images
CREATE POLICY "Barbers can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy for barbers to update their service images
CREATE POLICY "Barbers can update service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy for barbers to delete their service images
CREATE POLICY "Barbers can delete service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' 
  AND auth.uid() IS NOT NULL
);