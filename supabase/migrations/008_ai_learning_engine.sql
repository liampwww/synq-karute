-- =============================================================================
-- SYNQ Karute — AI Learning Engine
-- staff_conversation_patterns, org_learning_config, industry_patterns,
-- pre_session_briefs + columns for customer_insights, staff_analytics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add missing columns to customer_insights
-- -----------------------------------------------------------------------------
ALTER TABLE public.customer_insights ADD COLUMN IF NOT EXISTS staff_advice_next_visit text;

-- -----------------------------------------------------------------------------
-- 2. Add missing columns to staff_analytics
-- -----------------------------------------------------------------------------
ALTER TABLE public.staff_analytics ADD COLUMN IF NOT EXISTS topic_distribution jsonb DEFAULT '{}';
ALTER TABLE public.staff_analytics ADD COLUMN IF NOT EXISTS conversation_patterns jsonb DEFAULT '{}';
ALTER TABLE public.staff_analytics ADD COLUMN IF NOT EXISTS package_close_rate float8 DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 3. staff_conversation_patterns — AI-learned patterns per staff
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_conversation_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  -- 'opening_style' | 'topic_sequence' | 'close_technique' |
  -- 'listening_ratio' | 'personal_engagement' | 'upsell_approach'
  pattern_data jsonb NOT NULL DEFAULT '{}',
  effectiveness_score float8 DEFAULT 0,
  sample_size int DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scp_staff ON public.staff_conversation_patterns(staff_id);
CREATE INDEX IF NOT EXISTS idx_scp_org ON public.staff_conversation_patterns(org_id);
CREATE INDEX IF NOT EXISTS idx_scp_type ON public.staff_conversation_patterns(pattern_type);

ALTER TABLE public.staff_conversation_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org conversation patterns" ON public.staff_conversation_patterns;
CREATE POLICY "Staff can view org conversation patterns"
  ON public.staff_conversation_patterns FOR SELECT
  USING (org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "Owners/admins can manage conversation patterns" ON public.staff_conversation_patterns;
CREATE POLICY "Owners/admins can manage conversation patterns"
  ON public.staff_conversation_patterns FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 4. org_learning_config — cross-store learning scope
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_learning_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  learning_scope text DEFAULT 'store_only',
  -- 'store_only' | 'industry_pool' | 'selected_partners'
  partner_org_ids uuid[] DEFAULT '{}',
  share_patterns_to_pool boolean DEFAULT false,
  industry_for_pool text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_olc_org ON public.org_learning_config(org_id);

ALTER TABLE public.org_learning_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org learning config" ON public.org_learning_config;
CREATE POLICY "Staff can view org learning config"
  ON public.org_learning_config FOR SELECT
  USING (org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "Owners/admins can manage learning config" ON public.org_learning_config;
CREATE POLICY "Owners/admins can manage learning config"
  ON public.org_learning_config FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 5. industry_patterns — anonymized aggregate patterns across orgs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.industry_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  industry text NOT NULL,
  pattern_type text NOT NULL,
  pattern_data jsonb NOT NULL DEFAULT '{}',
  effectiveness_score float8 DEFAULT 0,
  contributing_stores_count int DEFAULT 0,
  sample_size int DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_industry ON public.industry_patterns(industry);
CREATE INDEX IF NOT EXISTS idx_ip_type ON public.industry_patterns(pattern_type);

ALTER TABLE public.industry_patterns ENABLE ROW LEVEL SECURITY;

-- Industry patterns are readable by any authenticated user (anonymized data)
DROP POLICY IF EXISTS "Authenticated can view industry patterns" ON public.industry_patterns;
CREATE POLICY "Authenticated can view industry patterns"
  ON public.industry_patterns FOR SELECT
  TO authenticated
  USING (true);

-- Only service role or backend can insert/update (no direct user writes)
DROP POLICY IF EXISTS "Service can manage industry patterns" ON public.industry_patterns;
CREATE POLICY "Service can manage industry patterns"
  ON public.industry_patterns FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 6. pre_session_briefs — AI-generated advice before each session
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pre_session_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  brief_content jsonb NOT NULL DEFAULT '{}',
  -- { talking_points: [], customer_history_summary: "",
  --   recommended_approach: "", upsell_opportunities: [],
  --   things_to_avoid: [] }
  was_viewed boolean DEFAULT false,
  session_outcome jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psb_staff_customer ON public.pre_session_briefs(staff_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_psb_org ON public.pre_session_briefs(org_id);
CREATE INDEX IF NOT EXISTS idx_psb_appointment ON public.pre_session_briefs(appointment_id);

ALTER TABLE public.pre_session_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view org pre-session briefs" ON public.pre_session_briefs;
CREATE POLICY "Staff can view org pre-session briefs"
  ON public.pre_session_briefs FOR SELECT
  USING (org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "Staff can update brief viewed status" ON public.pre_session_briefs;
CREATE POLICY "Staff can update brief viewed status"
  ON public.pre_session_briefs FOR UPDATE
  USING (org_id IN (SELECT public.get_my_org_ids()));

DROP POLICY IF EXISTS "Staff can insert pre-session briefs" ON public.pre_session_briefs;
CREATE POLICY "Staff can insert pre-session briefs"
  ON public.pre_session_briefs FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_my_org_ids()));
