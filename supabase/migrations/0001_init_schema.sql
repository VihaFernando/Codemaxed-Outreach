-- CodeMaxed Outreach Hub — initial schema
-- Run this first (SQL editor, or `supabase db push`), before 0002 and 0003.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('Sales / Business Development', 'Admin');

create type outreach_status as enum (
  'Draft', 'Sent', 'Replied', 'Qualified', 'Meeting Booked', 'Discovery Call',
  'Proposal Sent', 'Negotiation', 'Closed', 'Not Interested', 'No Response', 'Lost',
  'Follow-up Required'
);

create type meeting_type as enum ('Sales Meeting', 'Discovery Call', 'Demo', 'Consultation', 'Other');

create type meeting_status as enum ('Scheduled', 'Completed', 'Rescheduled', 'Cancelled', 'No Show');

create type proposal_status as enum ('Draft', 'Sent', 'Viewed', 'Negotiation', 'Accepted', 'Rejected', 'Expired');

create type follow_up_status as enum ('Pending', 'Completed', 'Cancelled');

create type target_metric as enum ('outreach', 'replies', 'meetings', 'discoveryCalls', 'proposals', 'closed');

create type activity_type as enum (
  'prospect_created', 'outreach_sent', 'reply_received', 'status_changed', 'meeting_booked',
  'meeting_completed', 'proposal_sent', 'negotiation_started', 'followup_scheduled',
  'followup_completed', 'deal_closed', 'deal_lost', 'note_added'
);

create type notification_kind as enum ('followup', 'meeting', 'proposal', 'target', 'reply');

-- ---------------------------------------------------------------------------
-- profiles (keyed to auth.users)
-- ---------------------------------------------------------------------------

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       user_role not null default 'Sales / Business Development',
  email      text not null,
  initials   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_initials text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  select string_agg(left(part, 1), '')
    into v_initials
    from (
      select part
      from unnest(string_to_array(v_name, ' ')) as part
      where part <> ''
      limit 2
    ) parts;

  insert into public.profiles (id, name, email, initials)
  values (new.id, v_name, new.email, coalesce(upper(v_initials), '?'));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table outreach_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table service_types (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  uses_discovery_call boolean not null default false,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create table lead_sources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Core CRM entities
-- ---------------------------------------------------------------------------

create table prospects (
  id                  uuid primary key default gen_random_uuid(),
  company             text not null,
  contact_person      text not null default '',
  job_title           text not null default '',
  email               text not null default '',
  phone               text not null default '',
  website             text not null default '',
  linkedin_url        text not null default '',
  facebook_url        text not null default '',
  instagram_url       text not null default '',
  google_business_url text not null default '',
  other_url           text not null default '',
  industry            text not null default '',
  location            text not null default '',
  notes               text not null default '',
  owner_id            uuid not null references profiles(id) on delete restrict,
  lead_source_id      uuid not null references lead_sources(id) on delete restrict,
  created_at          timestamptz not null default now()
);

create table opportunities (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references prospects(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete restrict,
  owner_id        uuid not null references profiles(id) on delete restrict,
  status          outreach_status not null default 'Draft',
  deal_value      numeric(14, 2) not null default 0,
  created_at      timestamptz not null default now()
);

create table outreach (
  id               uuid primary key default gen_random_uuid(),
  prospect_id      uuid not null references prospects(id) on delete cascade,
  opportunity_id   uuid not null references opportunities(id) on delete cascade,
  outreach_type_id uuid not null references outreach_types(id) on delete restrict,
  service_type_id  uuid not null references service_types(id) on delete restrict,
  owner_id         uuid not null references profiles(id) on delete restrict,
  occurred_at      timestamptz not null,
  replied_at       timestamptz,
  message          text not null default '',
  status           outreach_status not null default 'Sent',
  follow_up_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table activities (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references prospects(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  user_id        uuid not null references profiles(id) on delete restrict,
  type           activity_type not null,
  description    text not null,
  occurred_at    timestamptz not null default now()
);

create table follow_ups (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references prospects(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  owner_id       uuid not null references profiles(id) on delete restrict,
  due_at         timestamptz not null,
  notes          text not null default '',
  status         follow_up_status not null default 'Pending',
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table meetings (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references prospects(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  owner_id       uuid not null references profiles(id) on delete restrict,
  type           meeting_type not null,
  scheduled_at   timestamptz not null,
  status         meeting_status not null default 'Scheduled',
  notes          text not null default '',
  next_action    text not null default '',
  created_at     timestamptz not null default now()
);

create table proposals (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references prospects(id) on delete cascade,
  opportunity_id  uuid not null references opportunities(id) on delete cascade,
  service_type_id uuid not null references service_types(id) on delete restrict,
  owner_id        uuid not null references profiles(id) on delete restrict,
  sent_at         timestamptz not null,
  amount          numeric(14, 2) not null default 0,
  status          proposal_status not null default 'Draft',
  follow_up_at    timestamptz,
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

create table deals (
  id               uuid primary key default gen_random_uuid(),
  prospect_id      uuid not null references prospects(id) on delete cascade,
  opportunity_id   uuid not null references opportunities(id) on delete cascade,
  service_type_id  uuid not null references service_types(id) on delete restrict,
  outreach_type_id uuid not null references outreach_types(id) on delete restrict,
  owner_id         uuid not null references profiles(id) on delete restrict,
  closed_at        timestamptz not null,
  value            numeric(14, 2) not null default 0,
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

create table targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  metric         target_metric not null,
  daily          numeric(10, 2) not null default 0,
  weekly         numeric(10, 2),
  monthly        numeric(10, 2),
  effective_from timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, metric)
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade, -- null = broadcast to everyone
  title      text not null,
  body       text not null,
  kind       notification_kind not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpful indexes for the query patterns services.ts already relies on
-- ---------------------------------------------------------------------------

create index idx_opportunities_prospect on opportunities(prospect_id);
create index idx_outreach_prospect on outreach(prospect_id);
create index idx_outreach_opportunity on outreach(opportunity_id);
create index idx_outreach_occurred_at on outreach(occurred_at);
create index idx_activities_prospect on activities(prospect_id);
create index idx_follow_ups_prospect on follow_ups(prospect_id);
create index idx_follow_ups_due_at on follow_ups(due_at);
create index idx_meetings_opportunity on meetings(opportunity_id);
create index idx_proposals_opportunity on proposals(opportunity_id);
create index idx_deals_opportunity on deals(opportunity_id);
create index idx_notifications_user on notifications(user_id);
