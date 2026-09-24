-- Row Level Security policies.
-- Any authenticated team member can read/write/delete any CRM record (team-wide
-- shared visibility). profiles is the one exception: a user may only update
-- their own row, except Admins, who may update any profile row.
-- Run after 0001_init_schema.sql and 0002_set_outreach_status_rpc.sql.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;

create policy "authenticated read all profiles"
  on profiles for select
  using (auth.uid() is not null);

create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid() and me.role = 'Admin'
    )
  )
  with check (true);

-- No insert/delete policy: rows are created only by the handle_new_user()
-- trigger (security definer, bypasses RLS) and removed via the auth.users FK
-- cascade when an account is deleted from the Auth dashboard.

-- ---------------------------------------------------------------------------
-- Every other table: uniform "any authenticated user" policy.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'outreach_types', 'service_types', 'lead_sources',
    'prospects', 'opportunities', 'outreach', 'activities',
    'follow_ups', 'meetings', 'proposals', 'deals',
    'targets', 'notifications'
  ]
  loop
    execute format('alter table %I enable row level security;', t);

    execute format(
      'create policy "authenticated read" on %I for select using (auth.uid() is not null);', t
    );
    execute format(
      'create policy "authenticated insert" on %I for insert with check (auth.uid() is not null);', t
    );
    execute format(
      'create policy "authenticated update" on %I for update using (auth.uid() is not null) with check (auth.uid() is not null);', t
    );
    execute format(
      'create policy "authenticated delete" on %I for delete using (auth.uid() is not null);', t
    );
  end loop;
end;
$$;
