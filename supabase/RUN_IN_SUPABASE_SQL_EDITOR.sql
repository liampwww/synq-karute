-- =============================================================================
-- SYNQ Karute — One-click setup
--
-- 1. Open Supabase Dashboard → SQL Editor → New query
-- 2. Copy everything below this line and paste it
-- 3. Click Run
--
-- That's it. This creates all tables, columns, and storage needed for the app.
-- Safe to run multiple times (skips things that already exist).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. customer_insights
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_visits int DEFAULT 0,
  total_spend decimal(12,2) DEFAULT 0,
  ltv decimal(12,2) DEFAULT 0,
  avg_session_duration text,
  top_pro_topics jsonb DEFAULT '[]',
  top_personal_topics jsonb DEFAULT '[]',
  recurring_themes jsonb DEFAULT '[]',
  trend_analysis jsonb DEFAULT '{}',
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_customer_insights_customer UNIQUE (customer_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_insights_org ON public.customer_insights(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_insights_customer ON public.customer_insights(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_insights_ltv ON public.customer_insights(ltv DESC);
ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view org customer insights" ON public.customer_insights;
CREATE POLICY "Staff can view org customer insights" ON public.customer_insights FOR SELECT USING (org_id IN (SELECT public.get_my_org_ids()));
DROP POLICY IF EXISTS "Staff can insert org customer insights" ON public.customer_insights;
CREATE POLICY "Staff can insert org customer insights" ON public.customer_insights FOR INSERT WITH CHECK (org_id IN (SELECT public.get_my_org_ids()));
DROP POLICY IF EXISTS "Staff can update org customer insights" ON public.customer_insights;
CREATE POLICY "Staff can update org customer insights" ON public.customer_insights FOR UPDATE USING (org_id IN (SELECT public.get_my_org_ids()));

-- -----------------------------------------------------------------------------
-- 2. staff_analytics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_sessions int DEFAULT 0,
  avg_confidence float8 DEFAULT 0,
  talk_ratio jsonb DEFAULT '{}',
  top_topics jsonb DEFAULT '[]',
  customer_satisfaction_indicators jsonb DEFAULT '{}',
  repeat_rate float8 DEFAULT 0,
  revenue_attributed decimal(12,2) DEFAULT 0,
  ai_coaching_notes text,
  calculated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_staff_analytics_period UNIQUE (staff_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_staff_analytics_org ON public.staff_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_staff_analytics_staff ON public.staff_analytics(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_analytics_period ON public.staff_analytics(period_start, period_end);
ALTER TABLE public.staff_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view org staff analytics" ON public.staff_analytics;
CREATE POLICY "Staff can view org staff analytics" ON public.staff_analytics FOR SELECT USING (org_id IN (SELECT public.get_my_org_ids()));
DROP POLICY IF EXISTS "Owners/admins can insert staff analytics" ON public.staff_analytics;
CREATE POLICY "Owners/admins can insert staff analytics" ON public.staff_analytics FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM public.staff WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
DROP POLICY IF EXISTS "Owners/admins can update staff analytics" ON public.staff_analytics;
CREATE POLICY "Owners/admins can update staff analytics" ON public.staff_analytics FOR UPDATE USING (org_id IN (SELECT org_id FROM public.staff WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- -----------------------------------------------------------------------------
-- 3. staff_advice on karute_records
-- -----------------------------------------------------------------------------
ALTER TABLE public.karute_records ADD COLUMN IF NOT EXISTS staff_advice text;

-- -----------------------------------------------------------------------------
-- 4. webhook_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  url text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempt int NOT NULL DEFAULT 1,
  status int,
  response text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_org_created ON public.webhook_logs (org_id, created_at DESC);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view webhook logs for their org" ON public.webhook_logs;
CREATE POLICY "Users can view webhook logs for their org" ON public.webhook_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.org_id = webhook_logs.org_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "Staff can insert webhook logs for their org" ON public.webhook_logs;
CREATE POLICY "Staff can insert webhook logs for their org" ON public.webhook_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE s.org_id = webhook_logs.org_id AND s.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Recordings bucket + RLS (for audio uploads — REQUIRED for recording save)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('recordings', 'recordings', false, 104857600)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Staff can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Staff can download org recordings" ON storage.objects;
CREATE POLICY "Staff can upload recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] IN (SELECT org_id::text FROM public.staff WHERE user_id = auth.uid()));
CREATE POLICY "Staff can download org recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] IN (SELECT org_id::text FROM public.staff WHERE user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. Photos bucket + RLS (for customer photos)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', false, 10485760)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Authenticated users can view photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can delete own photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');
