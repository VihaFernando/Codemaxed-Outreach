-- set_outreach_status: atomic port of the client-side setOutreachStatus cascade.
-- Advances an outreach record's status, ratchets the parent opportunity forward
-- (never regresses an already-more-advanced stage), logs activity rows, and
-- auto-creates the matching meeting / proposal / deal exactly once so metrics
-- never double count. Run after 0001_init_schema.sql.

create or replace function outreach_status_rank(s outreach_status)
returns int
language sql
immutable
as $$
  select case s
    when 'Draft' then 0
    when 'Sent' then 1
    when 'No Response' then 1
    when 'Follow-up Required' then 1
    when 'Replied' then 2
    when 'Qualified' then 3
    when 'Meeting Booked' then 4
    when 'Discovery Call' then 4
    when 'Proposal Sent' then 5
    when 'Negotiation' then 6
    when 'Closed' then 7
    when 'Not Interested' then 0
    when 'Lost' then 0
  end;
$$;

create or replace function set_outreach_status(
  p_outreach_id uuid,
  p_status outreach_status,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_outreach outreach%rowtype;
  v_opportunity opportunities%rowtype;
  v_service service_types%rowtype;
  v_prospect prospects%rowtype;
  v_status_rank int;
  v_current_rank int;
  v_meeting_type meeting_type;
  v_has_meeting boolean;
  v_has_proposal boolean;
  v_has_deal boolean;
begin
  select * into v_outreach from outreach where id = p_outreach_id;
  if not found then
    raise exception 'outreach % not found', p_outreach_id;
  end if;

  select * into v_opportunity from opportunities where id = v_outreach.opportunity_id;
  select * into v_service from service_types where id = v_outreach.service_type_id;
  select * into v_prospect from prospects where id = v_outreach.prospect_id;

  v_status_rank := outreach_status_rank(p_status);

  -- 1. Update the outreach record itself.
  update outreach
  set status = p_status,
      replied_at = case
        when v_status_rank >= outreach_status_rank('Replied') and replied_at is null then now()
        else replied_at
      end
  where id = p_outreach_id;

  -- 2. Ratchet the opportunity forward (or set to 0-rank statuses like Lost/Not Interested).
  if v_opportunity.id is not null then
    v_current_rank := outreach_status_rank(v_opportunity.status);
    if v_status_rank >= v_current_rank or v_status_rank = 0 then
      update opportunities set status = p_status where id = v_opportunity.id;
    end if;
  end if;

  -- 3. Log the status change.
  insert into activities (prospect_id, opportunity_id, user_id, type, description)
  values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'status_changed',
          'Status changed to ' || p_status);

  if p_status = 'Replied' then
    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    select v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'reply_received',
           'Reply received via ' || ot.name
    from outreach_types ot where ot.id = v_outreach.outreach_type_id;
  end if;

  -- 4. Auto-create a meeting on first Meeting Booked / Discovery Call.
  select exists(select 1 from meetings where opportunity_id = v_outreach.opportunity_id)
    into v_has_meeting;
  if (p_status = 'Meeting Booked' or p_status = 'Discovery Call') and not v_has_meeting then
    v_meeting_type := case
      when p_status = 'Discovery Call' or coalesce(v_service.uses_discovery_call, false)
        then 'Discovery Call'::meeting_type
      else 'Sales Meeting'::meeting_type
    end;

    insert into meetings (prospect_id, opportunity_id, owner_id, type, scheduled_at, status, notes, next_action)
    values (
      v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, v_meeting_type,
      now() + interval '2 days', 'Scheduled',
      v_meeting_type || ' created from status change.', 'Confirm agenda'
    );

    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'meeting_booked',
            v_meeting_type || ' booked with ' || coalesce(nullif(v_prospect.contact_person, ''), 'contact'));
  end if;

  -- 5. Auto-create a proposal on first Proposal Sent.
  select exists(select 1 from proposals where opportunity_id = v_outreach.opportunity_id)
    into v_has_proposal;
  if p_status = 'Proposal Sent' and not v_has_proposal then
    insert into proposals (prospect_id, opportunity_id, service_type_id, owner_id, sent_at, amount, status, follow_up_at, notes)
    values (
      v_outreach.prospect_id, v_outreach.opportunity_id, v_outreach.service_type_id, p_actor_id,
      now(), coalesce(v_opportunity.deal_value, 0), 'Sent', now() + interval '5 days',
      'Proposal created from status change.'
    );

    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'proposal_sent', 'Proposal sent');
  end if;

  -- 6. Negotiation: move any non-accepted proposal to Negotiation, log it.
  if p_status = 'Negotiation' then
    update proposals
    set status = 'Negotiation'
    where opportunity_id = v_outreach.opportunity_id
      and status <> 'Accepted';

    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'negotiation_started', 'Negotiation started');
  end if;

  -- 7. Auto-create a deal on first Closed, accept the proposal.
  select exists(select 1 from deals where opportunity_id = v_outreach.opportunity_id)
    into v_has_deal;
  if p_status = 'Closed' and not v_has_deal then
    insert into deals (prospect_id, opportunity_id, service_type_id, outreach_type_id, owner_id, closed_at, value, notes)
    values (
      v_outreach.prospect_id, v_outreach.opportunity_id, v_outreach.service_type_id,
      v_outreach.outreach_type_id, p_actor_id, now(), coalesce(v_opportunity.deal_value, 0),
      'Closed from outreach status change.'
    );

    update proposals set status = 'Accepted' where opportunity_id = v_outreach.opportunity_id;

    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'deal_closed',
            'Deal closed — ' || coalesce(v_prospect.company, ''));
  end if;

  -- 8. Lost / Not Interested: log it.
  if p_status = 'Not Interested' or p_status = 'Lost' then
    insert into activities (prospect_id, opportunity_id, user_id, type, description)
    values (v_outreach.prospect_id, v_outreach.opportunity_id, p_actor_id, 'deal_lost', 'Marked as ' || p_status);
  end if;
end;
$$;
