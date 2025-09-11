-- Create storage bucket for task attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-attachments', 'task-attachments', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for task attachments bucket
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their task attachments" ON storage.objects;

-- Allow anyone to view public task attachments
CREATE POLICY "Anyone can view task attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'task-attachments');

-- Allow authenticated users to upload task attachments
CREATE POLICY "Authenticated users can upload task attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-attachments' AND 
  auth.uid() IS NOT NULL
);

-- Allow users to update their own task attachments
CREATE POLICY "Users can update their task attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'task-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'task-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own task attachments
CREATE POLICY "Users can delete their task attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-attachments' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Also create avatars bucket for profile pictures if needed
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for avatars bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatar" ON storage.objects;

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid() IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);