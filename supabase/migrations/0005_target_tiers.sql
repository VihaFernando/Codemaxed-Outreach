-- Replace the single-number daily/weekly/monthly target model with three
-- weekly tiers (Minimum / Average / Stretch), and add per-outreach-channel
-- weekly targets alongside the existing per-metric targets. The `targets`
-- table has no rows yet in production (this is a brand-new feature), so a
-- clean column swap is safe here.
-- Run after 0001-0004.

-- ---------------------------------------------------------------------------
-- targets: drop the old daily/weekly/monthly columns, add tiered columns.
-- ---------------------------------------------------------------------------

alter table targets
  drop column if exists daily,
  drop column if exists weekly,
  drop column if exists monthly;

alter table targets
  add column minimum numeric(10, 2) not null default 0,
  add column average numeric(10, 2) not null default 0,
  add column stretch numeric(10, 2) not null default 0;

comment on table targets is 'Weekly Minimum/Average/Stretch targets per user per pipeline metric (outreach, replies, meetings, discoveryCalls, proposals, closed).';
comment on column targets.minimum is 'Weekly minimum target.';
comment on column targets.average is 'Weekly average target.';
comment on column targets.stretch is 'Weekly stretch target.';

-- effective_from/updated_at columns are unchanged and still useful.

-- ---------------------------------------------------------------------------
-- outreach_type_targets: weekly Minimum/Average/Stretch targets per user per
-- outreach channel (WhatsApp, LinkedIn, Email, ...).
-- ---------------------------------------------------------------------------

create table outreach_type_targets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  outreach_type_id uuid not null references outreach_types(id) on delete cascade,
  minimum          numeric(10, 2) not null default 0,
  average          numeric(10, 2) not null default 0,
  stretch          numeric(10, 2) not null default 0,
  updated_at       timestamptz not null default now(),
  unique (user_id, outreach_type_id)
);

comment on table outreach_type_targets is 'Weekly Minimum/Average/Stretch outreach-volume targets per user per outreach channel.';

alter table outreach_type_targets enable row level security;

create policy "authenticated read" on outreach_type_targets
  for select using (auth.uid() is not null);
create policy "authenticated insert" on outreach_type_targets
  for insert with check (auth.uid() is not null);
create policy "authenticated update" on outreach_type_targets
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "authenticated delete" on outreach_type_targets
  for delete using (auth.uid() is not null);

create index idx_outreach_type_targets_user on outreach_type_targets(user_id);
