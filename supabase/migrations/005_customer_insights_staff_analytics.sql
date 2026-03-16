-- ============================================================================
-- SYNQ Karute — Customer Insights + Staff Analytics
-- LTV learning engine + staff performance analytics
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. customer_insights
-- --------------------------------------------------------------------------
CREATE TABLE public.customer_insights (
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

CREATE INDEX idx_customer_insights_org ON public.customer_insights(org_id);
CREATE INDEX idx_customer_insights_customer ON public.customer_insights(customer_id);
CREATE INDEX idx_customer_insights_ltv ON public.customer_insights(ltv DESC);

ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view org customer insights"
  ON public.customer_insights FOR SELECT
  USING (org_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "Staff can insert org customer insights"
  ON public.customer_insights FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "Staff can update org customer insights"
  ON public.customer_insights FOR UPDATE
  USING (org_id IN (SELECT public.get_my_org_ids()));

-- --------------------------------------------------------------------------
-- 2. staff_analytics
-- --------------------------------------------------------------------------
CREATE TABLE public.staff_analytics (
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

CREATE INDEX idx_staff_analytics_org ON public.staff_analytics(org_id);
CREATE INDEX idx_staff_analytics_staff ON public.staff_analytics(staff_id);
CREATE INDEX idx_staff_analytics_period ON public.staff_analytics(period_start, period_end);

ALTER TABLE public.staff_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view org staff analytics"
  ON public.staff_analytics FOR SELECT
  USING (org_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "Owners/admins can insert staff analytics"
  ON public.staff_analytics FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners/admins can update staff analytics"
  ON public.staff_analytics FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
