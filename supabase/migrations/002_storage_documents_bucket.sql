-- Create documents storage bucket for brochures, agreements, and other files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,  -- 50 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to the documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Authenticated users can read documents
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
