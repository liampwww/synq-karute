-- webhook_logs: audit trail for outbound webhook deliveries
create table public.webhook_logs (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations (id) on delete cascade,
  event_type text        not null,
  url        text        not null,
  payload    jsonb       not null default '{}',
  attempt    int         not null default 1,
  status     int,
  response   text,
  error      text,
  created_at timestamptz not null default now()
);

create index idx_webhook_logs_org_created on public.webhook_logs (org_id, created_at desc);

alter table public.webhook_logs enable row level security;

create policy "Users can view webhook logs for their org"
  on public.webhook_logs for select
  using (
    exists (
      select 1 from public.staff s
      where s.org_id = webhook_logs.org_id
        and s.user_id = auth.uid()
    )
  );

create policy "Staff can insert webhook logs for their org"
  on public.webhook_logs for insert
  with check (
    exists (
      select 1 from public.staff s
      where s.org_id = webhook_logs.org_id
        and s.user_id = auth.uid()
    )
  );
