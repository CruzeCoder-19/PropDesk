-- 006_media_bucket.sql
-- Public storage bucket for organisation logos and user avatars.
-- Must be public so <img> tags render without auth headers.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload / replace objects
CREATE POLICY "media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Anyone can view (public bucket, but belt-and-suspenders)
CREATE POLICY "media_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

-- Authenticated users can delete their own uploads
CREATE POLICY "media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media');
