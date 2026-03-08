-- Add visit tracking columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS first_visit_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;

-- Create index for inactivity queries
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON public.customers(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_customers_visit_count ON public.customers(visit_count);

-- Create a photos storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for photos bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');
