-- ============================================================================
-- SYNQ Karute v3 — Initial Schema Migration
-- AI-powered electronic chart (カルテ) system for salons
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- 1. Helper: updated_at trigger function
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- 2. Tables
-- --------------------------------------------------------------------------

-- 2-1. organizations
create table public.organizations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  type       text        not null default 'salon',
  settings   jsonb       default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- 2-2. staff
create table public.staff (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  role       text        not null default 'stylist'
                         check (role in ('owner', 'admin', 'stylist', 'assistant')),
  email      text        not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- 2-3. customers
create table public.customers (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations (id) on delete cascade,
  name       text        not null,
  name_kana  text,
  phone      text,
  email      text,
  profile    jsonb       default '{}',
  tags       text[]      not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- 2-4. appointments
create table public.appointments (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations (id) on delete cascade,
  customer_id  uuid        not null references public.customers (id) on delete cascade,
  staff_id     uuid        not null references public.staff (id) on delete restrict,
  start_time   timestamptz not null,
  end_time     timestamptz not null,
  status       text        not null default 'scheduled'
                           check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  service_type text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint chk_appointments_time_range check (end_time > start_time)
);

create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- 2-5. recording_sessions
create table public.recording_sessions (
  id                 uuid        primary key default gen_random_uuid(),
  appointment_id     uuid        references public.appointments (id) on delete set null,
  staff_id           uuid        not null references public.staff (id) on delete restrict,
  customer_id        uuid        not null references public.customers (id) on delete cascade,
  org_id             uuid        not null references public.organizations (id) on delete cascade,
  audio_storage_path text,
  duration_seconds   integer,
  status             text        not null default 'recording'
                                 check (status in ('recording', 'paused', 'completed', 'processing', 'failed')),
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  created_at         timestamptz not null default now()
);

-- 2-6. transcription_segments
create table public.transcription_segments (
  id            uuid        primary key default gen_random_uuid(),
  recording_id  uuid        not null references public.recording_sessions (id) on delete cascade,
  segment_index integer     not null,
  speaker_label text,
  content       text        not null,
  start_ms      integer     not null,
  end_ms        integer     not null,
  language      text        not null default 'ja',
  created_at    timestamptz not null default now(),

  constraint chk_segment_time_range check (end_ms > start_ms)
);

-- 2-7. karute_records
create table public.karute_records (
  id             uuid        primary key default gen_random_uuid(),
  customer_id    uuid        not null references public.customers (id) on delete cascade,
  recording_id   uuid        references public.recording_sessions (id) on delete set null,
  staff_id       uuid        not null references public.staff (id) on delete restrict,
  appointment_id uuid        references public.appointments (id) on delete set null,
  org_id         uuid        not null references public.organizations (id) on delete cascade,
  ai_summary     text,
  status         text        not null default 'draft'
                             check (status in ('draft', 'review', 'approved')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_karute_records_updated_at
  before update on public.karute_records
  for each row execute function public.set_updated_at();

-- 2-8. karute_entries
create table public.karute_entries (
  id             uuid        primary key default gen_random_uuid(),
  karute_id      uuid        not null references public.karute_records (id) on delete cascade,
  category       text        not null
                             check (category in (
                               'symptom', 'treatment', 'preference',
                               'lifestyle', 'next_appointment', 'product', 'other'
                             )),
  content        text        not null,
  original_quote text,
  confidence     float       not null default 0.0,
  metadata       jsonb       default '{}',
  created_at     timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 3. Indexes
-- --------------------------------------------------------------------------

-- org_id lookups (every org-scoped table)
create index idx_staff_org_id              on public.staff (org_id);
create index idx_customers_org_id          on public.customers (org_id);
create index idx_appointments_org_id       on public.appointments (org_id);
create index idx_recording_sessions_org_id on public.recording_sessions (org_id);
create index idx_karute_records_org_id     on public.karute_records (org_id);

-- customer_id lookups
create index idx_appointments_customer_id       on public.appointments (customer_id);
create index idx_recording_sessions_customer_id on public.recording_sessions (customer_id);
create index idx_karute_records_customer_id     on public.karute_records (customer_id);

-- recording / karute parent lookups
create index idx_transcription_segments_recording_id on public.transcription_segments (recording_id);
create index idx_karute_entries_karute_id            on public.karute_entries (karute_id);

-- scheduling queries
create index idx_appointments_start_time on public.appointments (start_time);

-- staff user_id for RLS joins
create index idx_staff_user_id on public.staff (user_id);

-- unique constraint: one auth user per org
create unique index uq_staff_org_user on public.staff (org_id, user_id);

-- --------------------------------------------------------------------------
-- 4. Row-Level Security
-- --------------------------------------------------------------------------

-- Helper: resolve the caller's org_ids from their auth.uid()
create or replace function public.get_my_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.staff where user_id = auth.uid();
$$;

-- Enable RLS on every table
alter table public.organizations         enable row level security;
alter table public.staff                 enable row level security;
alter table public.customers             enable row level security;
alter table public.appointments          enable row level security;
alter table public.recording_sessions    enable row level security;
alter table public.transcription_segments enable row level security;
alter table public.karute_records        enable row level security;
alter table public.karute_entries        enable row level security;

-- ---- organizations ----
create policy "Staff can view their own organizations"
  on public.organizations for select
  using (id in (select public.get_my_org_ids()));

create policy "Owners can update their organization"
  on public.organizations for update
  using (
    id in (
      select org_id from public.staff
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ---- staff ----
create policy "Staff can view colleagues in same org"
  on public.staff for select
  using (org_id in (select public.get_my_org_ids()));

create policy "Owners/admins can insert staff"
  on public.staff for insert
  with check (
    org_id in (
      select org_id from public.staff
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners/admins can update staff"
  on public.staff for update
  using (
    org_id in (
      select org_id from public.staff
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Owners can delete staff"
  on public.staff for delete
  using (
    org_id in (
      select org_id from public.staff
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ---- customers ----
create policy "Staff can view org customers"
  on public.customers for select
  using (org_id in (select public.get_my_org_ids()));

create policy "Staff can insert org customers"
  on public.customers for insert
  with check (org_id in (select public.get_my_org_ids()));

create policy "Staff can update org customers"
  on public.customers for update
  using (org_id in (select public.get_my_org_ids()));

create policy "Owners/admins can delete customers"
  on public.customers for delete
  using (
    org_id in (
      select org_id from public.staff
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ---- appointments ----
create policy "Staff can view org appointments"
  on public.appointments for select
  using (org_id in (select public.get_my_org_ids()));

create policy "Staff can insert org appointments"
  on public.appointments for insert
  with check (org_id in (select public.get_my_org_ids()));

create policy "Staff can update org appointments"
  on public.appointments for update
  using (org_id in (select public.get_my_org_ids()));

create policy "Staff can delete org appointments"
  on public.appointments for delete
  using (org_id in (select public.get_my_org_ids()));

-- ---- recording_sessions ----
create policy "Staff can view org recordings"
  on public.recording_sessions for select
  using (org_id in (select public.get_my_org_ids()));

create policy "Staff can insert org recordings"
  on public.recording_sessions for insert
  with check (org_id in (select public.get_my_org_ids()));

create policy "Staff can update org recordings"
  on public.recording_sessions for update
  using (org_id in (select public.get_my_org_ids()));

-- ---- transcription_segments ----
create policy "Staff can view org transcription segments"
  on public.transcription_segments for select
  using (
    recording_id in (
      select id from public.recording_sessions
      where org_id in (select public.get_my_org_ids())
    )
  );

create policy "Staff can insert org transcription segments"
  on public.transcription_segments for insert
  with check (
    recording_id in (
      select id from public.recording_sessions
      where org_id in (select public.get_my_org_ids())
    )
  );

-- ---- karute_records ----
create policy "Staff can view org karute records"
  on public.karute_records for select
  using (org_id in (select public.get_my_org_ids()));

create policy "Staff can insert org karute records"
  on public.karute_records for insert
  with check (org_id in (select public.get_my_org_ids()));

create policy "Staff can update org karute records"
  on public.karute_records for update
  using (org_id in (select public.get_my_org_ids()));

-- ---- karute_entries ----
create policy "Staff can view org karute entries"
  on public.karute_entries for select
  using (
    karute_id in (
      select id from public.karute_records
      where org_id in (select public.get_my_org_ids())
    )
  );

create policy "Staff can insert org karute entries"
  on public.karute_entries for insert
  with check (
    karute_id in (
      select id from public.karute_records
      where org_id in (select public.get_my_org_ids())
    )
  );

create policy "Staff can update org karute entries"
  on public.karute_entries for update
  using (
    karute_id in (
      select id from public.karute_records
      where org_id in (select public.get_my_org_ids())
    )
  );

-- --------------------------------------------------------------------------
-- 5. Storage bucket for audio recordings
-- --------------------------------------------------------------------------
-- Supabase Storage buckets are created via the dashboard or the storage API,
-- not via SQL migrations. Set up the following bucket manually or via the
-- Supabase CLI (supabase/config.toml):
--
--   Bucket name : recordings
--   Public      : false
--   File size   : 100 MB max
--   Allowed MIME: audio/webm, audio/mp4, audio/wav, audio/ogg
--
-- Recommended storage RLS policies (apply via dashboard → Storage → Policies):
--
--   SELECT  — authenticated, path matches '{org_id}/**'
--             where org_id in (select public.get_my_org_ids())
--
--   INSERT  — authenticated, same org_id check
--
--   DELETE  — authenticated, role in ('owner','admin'), same org_id check
-- --------------------------------------------------------------------------
