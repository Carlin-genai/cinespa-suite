-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', true);

-- Create storage policies for task attachments
CREATE POLICY "Anyone can view task attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own task attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own task attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);