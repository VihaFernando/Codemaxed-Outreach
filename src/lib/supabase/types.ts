// Hand-authored types mirroring supabase/migrations/0001_init_schema.sql.
// Once the Supabase project exists, regenerate this with the CLI to stay in sync:
//   supabase gen types typescript --project-id <project-ref> > src/lib/supabase/types.ts

export type UserRoleRow = "Sales / Business Development" | "Admin";

export type OutreachStatusRow =
  | "Draft"
  | "Sent"
  | "Replied"
  | "Qualified"
  | "Meeting Booked"
  | "Discovery Call"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed"
  | "Not Interested"
  | "No Response"
  | "Lost"
  | "Follow-up Required";

export type MeetingTypeRow = "Sales Meeting" | "Discovery Call" | "Demo" | "Consultation" | "Other";
export type MeetingStatusRow = "Scheduled" | "Completed" | "Rescheduled" | "Cancelled" | "No Show";
export type ProposalStatusRow =
  "Draft" | "Sent" | "Viewed" | "Negotiation" | "Accepted" | "Rejected" | "Expired";
export type FollowUpStatusRow = "Pending" | "Completed" | "Cancelled";
export type TargetMetricRow =
  "outreach" | "replies" | "meetings" | "discoveryCalls" | "proposals" | "closed";
export type ActivityTypeRow =
  | "prospect_created"
  | "outreach_sent"
  | "reply_received"
  | "status_changed"
  | "meeting_booked"
  | "meeting_completed"
  | "proposal_sent"
  | "negotiation_started"
  | "followup_scheduled"
  | "followup_completed"
  | "deal_closed"
  | "deal_lost"
  | "note_added";
export type NotificationKindRow = "followup" | "meeting" | "proposal" | "target" | "reply";

export type ProfileRow = {
  id: string;
  name: string;
  role: UserRoleRow;
  email: string;
  initials: string;
  active: boolean;
  created_at: string;
};

export type OutreachTypeRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type ServiceTypeRow = {
  id: string;
  name: string;
  uses_discovery_call: boolean;
  active: boolean;
  created_at: string;
};

export type LeadSourceRow = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type ProspectRow = {
  id: string;
  company: string;
  contact_person: string;
  job_title: string;
  email: string;
  phone: string;
  website: string;
  linkedin_url: string;
  facebook_url: string;
  instagram_url: string;
  google_business_url: string;
  other_url: string;
  industry: string;
  location: string;
  notes: string;
  owner_id: string;
  lead_source_id: string;
  created_at: string;
};

export type OpportunityRow = {
  id: string;
  prospect_id: string;
  service_type_id: string;
  owner_id: string;
  status: OutreachStatusRow;
  deal_value: number;
  created_at: string;
};

export type OutreachRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  outreach_type_id: string;
  service_type_id: string;
  owner_id: string;
  occurred_at: string;
  replied_at: string | null;
  message: string;
  status: OutreachStatusRow;
  follow_up_at: string | null;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string | null;
  user_id: string;
  type: ActivityTypeRow;
  description: string;
  occurred_at: string;
};

export type FollowUpRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  owner_id: string;
  due_at: string;
  notes: string;
  status: FollowUpStatusRow;
  completed_at: string | null;
  created_at: string;
};

export type MeetingRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  owner_id: string;
  type: MeetingTypeRow;
  scheduled_at: string;
  status: MeetingStatusRow;
  notes: string;
  next_action: string;
  created_at: string;
};

export type ProposalRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  service_type_id: string;
  owner_id: string;
  sent_at: string;
  amount: number;
  status: ProposalStatusRow;
  follow_up_at: string | null;
  notes: string;
  created_at: string;
};

export type DealRow = {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  service_type_id: string;
  outreach_type_id: string;
  owner_id: string;
  closed_at: string;
  value: number;
  notes: string;
  created_at: string;
};

export type TargetRow = {
  id: string;
  user_id: string;
  service_type_id: string;
  metric: TargetMetricRow;
  minimum: number;
  average: number;
  stretch: number;
  effective_from: string;
  updated_at: string;
};

export type OutreachTypeTargetRow = {
  id: string;
  user_id: string;
  service_type_id: string;
  outreach_type_id: string;
  minimum: number;
  average: number;
  stretch: number;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  kind: NotificationKindRow;
  read: boolean;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      outreach_types: {
        Row: OutreachTypeRow;
        Insert: Partial<OutreachTypeRow> & { name: string };
        Update: Partial<OutreachTypeRow>;
        Relationships: [];
      };
      service_types: {
        Row: ServiceTypeRow;
        Insert: Partial<ServiceTypeRow> & { name: string };
        Update: Partial<ServiceTypeRow>;
        Relationships: [];
      };
      lead_sources: {
        Row: LeadSourceRow;
        Insert: Partial<LeadSourceRow> & { name: string };
        Update: Partial<LeadSourceRow>;
        Relationships: [];
      };
      prospects: {
        Row: ProspectRow;
        Insert: Partial<ProspectRow> & {
          company: string;
          owner_id: string;
          lead_source_id: string;
        };
        Update: Partial<ProspectRow>;
        Relationships: [];
      };
      opportunities: {
        Row: OpportunityRow;
        Insert: Partial<OpportunityRow> & {
          prospect_id: string;
          service_type_id: string;
          owner_id: string;
        };
        Update: Partial<OpportunityRow>;
        Relationships: [];
      };
      outreach: {
        Row: OutreachRow;
        Insert: Partial<OutreachRow> & {
          prospect_id: string;
          opportunity_id: string;
          outreach_type_id: string;
          service_type_id: string;
          owner_id: string;
          occurred_at: string;
        };
        Update: Partial<OutreachRow>;
        Relationships: [];
      };
      activities: {
        Row: ActivityRow;
        Insert: Partial<ActivityRow> & {
          prospect_id: string;
          user_id: string;
          type: ActivityTypeRow;
          description: string;
        };
        Update: Partial<ActivityRow>;
        Relationships: [];
      };
      follow_ups: {
        Row: FollowUpRow;
        Insert: Partial<FollowUpRow> & {
          prospect_id: string;
          opportunity_id: string;
          owner_id: string;
          due_at: string;
        };
        Update: Partial<FollowUpRow>;
        Relationships: [];
      };
      meetings: {
        Row: MeetingRow;
        Insert: Partial<MeetingRow> & {
          prospect_id: string;
          opportunity_id: string;
          owner_id: string;
          type: MeetingTypeRow;
          scheduled_at: string;
        };
        Update: Partial<MeetingRow>;
        Relationships: [];
      };
      proposals: {
        Row: ProposalRow;
        Insert: Partial<ProposalRow> & {
          prospect_id: string;
          opportunity_id: string;
          service_type_id: string;
          owner_id: string;
          sent_at: string;
        };
        Update: Partial<ProposalRow>;
        Relationships: [];
      };
      deals: {
        Row: DealRow;
        Insert: Partial<DealRow> & {
          prospect_id: string;
          opportunity_id: string;
          service_type_id: string;
          outreach_type_id: string;
          owner_id: string;
          closed_at: string;
        };
        Update: Partial<DealRow>;
        Relationships: [];
      };
      targets: {
        Row: TargetRow;
        Insert: Partial<TargetRow> & {
          user_id: string;
          service_type_id: string;
          metric: TargetMetricRow;
        };
        Update: Partial<TargetRow>;
        Relationships: [];
      };
      outreach_type_targets: {
        Row: OutreachTypeTargetRow;
        Insert: Partial<OutreachTypeTargetRow> & {
          user_id: string;
          service_type_id: string;
          outreach_type_id: string;
        };
        Update: Partial<OutreachTypeTargetRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & {
          title: string;
          body: string;
          kind: NotificationKindRow;
        };
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_outreach_status: {
        Args: { p_outreach_id: string; p_status: OutreachStatusRow; p_actor_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
