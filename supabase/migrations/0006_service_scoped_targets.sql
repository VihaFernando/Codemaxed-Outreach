-- Scope targets and outreach_type_targets to a service, in addition to a
-- user. Each user now sets Minimum/Average/Stretch targets per service, and
-- outreach-channel targets are split per service too (e.g. "LinkedIn
-- outreach for Website service" vs "LinkedIn outreach for AI Program").
--
-- Existing rows were entered under the old user-only model with no service
-- association, so they can't be mapped to a service automatically. They are
-- cleared here; targets are re-entered per service from the Targets page
-- after this migration runs.
-- Run after 0001-0005.

-- ---------------------------------------------------------------------------
-- targets: clear old rows, add service_type_id, re-key uniqueness to
-- (user, service, metric).
-- ---------------------------------------------------------------------------

delete from targets;

alter table targets
  add column service_type_id uuid references service_types(id) on delete cascade;

alter table targets alter column service_type_id set not null;

alter table targets drop constraint if exists targets_user_id_metric_key;
alter table targets add constraint targets_user_service_metric_key
  unique (user_id, service_type_id, metric);

comment on column targets.service_type_id is 'The service these weekly targets apply to.';

create index idx_targets_service on targets(service_type_id);

-- ---------------------------------------------------------------------------
-- outreach_type_targets: clear old rows, add service_type_id, re-key
-- uniqueness to (user, service, outreach_type).
-- ---------------------------------------------------------------------------

delete from outreach_type_targets;

alter table outreach_type_targets
  add column service_type_id uuid references service_types(id) on delete cascade;

alter table outreach_type_targets alter column service_type_id set not null;

alter table outreach_type_targets drop constraint if exists outreach_type_targets_user_id_outreach_type_id_key;
alter table outreach_type_targets add constraint outreach_type_targets_user_service_channel_key
  unique (user_id, service_type_id, outreach_type_id);

comment on column outreach_type_targets.service_type_id is 'The service this weekly channel target applies to.';

create index idx_outreach_type_targets_service on outreach_type_targets(service_type_id);
