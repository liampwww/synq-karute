-- Create migrations storage bucket for CSV, Excel, JSON import files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'migrations',
  'migrations',
  false,
  104857600,
  ARRAY[
    'text/csv',
    'text/plain',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- RLS policies for migrations bucket
CREATE POLICY "Authenticated users can upload migrations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'migrations');

CREATE POLICY "Authenticated users can view migrations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'migrations');

CREATE POLICY "Authenticated users can delete migrations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'migrations');
