-- Persist each user's last-selected services on the Targets page, so the
-- selection follows their account instead of living only in browser
-- localStorage. Stored on profiles since it's a per-user UI preference, not
-- pipeline data; the existing "users update own profile" RLS policy already
-- covers self-writes here.
-- Run after 0001-0006.

alter table profiles
  add column targets_selected_service_ids uuid[] not null default '{}';

comment on column profiles.targets_selected_service_ids is 'Service types this user last selected on the Targets page (UI preference, not pipeline data).';
