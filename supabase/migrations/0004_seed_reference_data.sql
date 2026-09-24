-- Optional: seed the reference-data lookup tables (outreach types, service
-- types, lead sources) so the app's dropdowns aren't empty. Run this once in
-- the Supabase SQL editor after 0001-0003. Safe to skip or edit the lists
-- below to match what your team actually uses — none of this is demo/customer
-- data, just picklist options.

insert into outreach_types (name) values
  ('WhatsApp'),
  ('LinkedIn'),
  ('Email'),
  ('Facebook'),
  ('Reddit'),
  ('Instagram'),
  ('Phone Call'),
  ('Google Business'),
  ('Other');

insert into service_types (name, uses_discovery_call) values
  ('Website', false),
  ('Custom Software', false),
  ('Subscription App', false),
  ('PC Build', false),
  ('AI Program', true),
  ('AI Custom Solutions', true);

insert into lead_sources (name) values
  ('LinkedIn'),
  ('Google'),
  ('Facebook'),
  ('Instagram'),
  ('Website'),
  ('Referral'),
  ('Existing Contact'),
  ('Manual Research'),
  ('Other');
