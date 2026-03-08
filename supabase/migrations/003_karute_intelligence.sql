-- SYNQ Karute Intelligence Platform
-- Adds: timeline_events, customer_photos, customer_ai_insights, migration_jobs, migration_records

-- Unified customer timeline
CREATE TABLE public.timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'visit','treatment','note','photo','form',
        'contact','import','milestone','status_change'
    )),
    source TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT,
    title TEXT NOT NULL,
    description TEXT,
    structured_data JSONB DEFAULT '{}'::jsonb,
    event_date TIMESTAMPTZ NOT NULL,
    linked_record_id UUID,
    linked_record_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer photos
CREATE TABLE public.customer_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    timeline_event_id UUID REFERENCES public.timeline_events(id),
    storage_path TEXT NOT NULL,
    caption TEXT,
    photo_type TEXT DEFAULT 'general'
        CHECK (photo_type IN ('before','after','progress','general','form')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI-generated insights per customer
CREATE TABLE public.customer_ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'next_treatment','follow_up','reactivation','churn_risk',
        'unresolved_issue','talking_point','upsell','photo_request',
        'plan_incomplete','high_value','general'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_data JSONB DEFAULT '{}'::jsonb,
    priority_score FLOAT NOT NULL DEFAULT 0.5
        CHECK (priority_score >= 0 AND priority_score <= 1),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','dismissed','actioned','expired')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration engine: job tracking
CREATE TABLE public.migration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id),
    source_type TEXT NOT NULL,
    source_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending','analyzing','mapping','importing',
            'completed','failed','cancelled','rolling_back'
        )),
    total_records INTEGER DEFAULT 0,
    imported_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    field_mapping JSONB,
    error_log JSONB DEFAULT '[]'::jsonb,
    uploaded_file_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration engine: per-record tracking
CREATE TABLE public.migration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
    source_row_index INTEGER,
    target_table TEXT NOT NULL,
    target_id UUID,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','imported','failed','skipped','duplicate')),
    source_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_timeline_customer ON public.timeline_events(customer_id);
CREATE INDEX idx_timeline_org ON public.timeline_events(org_id);
CREATE INDEX idx_timeline_date ON public.timeline_events(event_date DESC);
CREATE INDEX idx_timeline_type ON public.timeline_events(event_type);
CREATE INDEX idx_timeline_linked ON public.timeline_events(linked_record_id);
CREATE INDEX idx_photos_customer ON public.customer_photos(customer_id);
CREATE INDEX idx_photos_timeline ON public.customer_photos(timeline_event_id);
CREATE INDEX idx_insights_customer ON public.customer_ai_insights(customer_id);
CREATE INDEX idx_insights_status ON public.customer_ai_insights(status);
CREATE INDEX idx_insights_type ON public.customer_ai_insights(insight_type);
CREATE INDEX idx_insights_priority ON public.customer_ai_insights(priority_score DESC);
CREATE INDEX idx_migration_jobs_org ON public.migration_jobs(org_id);
CREATE INDEX idx_migration_jobs_status ON public.migration_jobs(status);
CREATE INDEX idx_migration_records_job ON public.migration_records(job_id);
CREATE INDEX idx_migration_records_status ON public.migration_records(status);

-- RLS policies (using existing get_my_org_ids() function)
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_timeline" ON public.timeline_events
    FOR ALL USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "org_photos" ON public.customer_photos
    FOR ALL USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "org_insights" ON public.customer_ai_insights
    FOR ALL USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "org_migration_jobs" ON public.migration_jobs
    FOR ALL USING (org_id IN (SELECT get_my_org_ids()));
CREATE POLICY "org_migration_records" ON public.migration_records
    FOR ALL USING (job_id IN (
        SELECT id FROM public.migration_jobs
        WHERE org_id IN (SELECT get_my_org_ids())
    ));

-- Triggers for updated_at
CREATE TRIGGER set_timeline_events_updated_at
    BEFORE UPDATE ON public.timeline_events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_migration_jobs_updated_at
    BEFORE UPDATE ON public.migration_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
