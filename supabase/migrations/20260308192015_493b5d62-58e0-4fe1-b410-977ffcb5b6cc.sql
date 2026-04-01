
-- Add missing columns to technician_profiles
ALTER TABLE public.technician_profiles
  ADD COLUMN IF NOT EXISTS shop_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maps_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS alt_phone text DEFAULT '';

-- Create storage bucket for technician uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-uploads', 'technician-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Technicians can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'technician-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public can read technician uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'technician-uploads');

-- Allow technicians to update/delete own files
CREATE POLICY "Technicians can manage own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'technician-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
