// Domain models. Shaped so a Postgres/Supabase schema can back them later:
// every entity has a stable string id and ISO-8601 timestamps.

export type ID = string;

export type UserRole = "Sales / Business Development" | "Admin";

export interface User {
  id: ID;
  name: string;
  role: UserRole;
  email: string;
  initials: string;
  active: boolean;
  /** Service types this user last selected on the Targets page. */
  targetsSelectedServiceIds: ID[];
}

export interface OutreachType {
  id: ID;
  name: string;
  active: boolean;
}

export interface ServiceType {
  id: ID;
  name: string;
  /** AI-style services qualify through a Discovery Call instead of a Meeting. */
  usesDiscoveryCall: boolean;
  active: boolean;
}

export interface LeadSource {
  id: ID;
  name: string;
  active: boolean;
}

export const OUTREACH_STATUSES = [
  "Draft",
  "Sent",
  "Replied",
  "Qualified",
  "Meeting Booked",
  "Discovery Call",
  "Proposal Sent",
  "Negotiation",
  "Closed",
  "Not Interested",
  "No Response",
  "Lost",
  "Follow-up Required",
] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const PIPELINE_STAGES = [
  "Sent",
  "Replied",
  "Qualified",
  "Meeting / Discovery",
  "Proposal",
  "Negotiation",
  "Closed",
  "Not Interested / Lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface Prospect {
  id: ID;
  company: string;
  contactPerson: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  linkedinUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  googleBusinessUrl: string;
  otherUrl: string;
  industry: string;
  location: string;
  notes: string;
  ownerId: ID;
  leadSourceId: ID;
  createdAt: string;
}

/** One company can pursue several services; each is its own pipeline item. */
export interface Opportunity {
  id: ID;
  prospectId: ID;
  serviceTypeId: ID;
  ownerId: ID;
  status: OutreachStatus;
  dealValue: number;
  createdAt: string;
}

export interface Outreach {
  id: ID;
  prospectId: ID;
  opportunityId: ID;
  outreachTypeId: ID;
  serviceTypeId: ID;
  ownerId: ID;
  occurredAt: string;
  repliedAt?: string | null;
  message: string;
  status: OutreachStatus;
  followUpAt?: string | null;
}

export type ActivityType =
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

export interface Activity {
  id: ID;
  prospectId: ID;
  opportunityId?: ID | null;
  userId: ID;
  type: ActivityType;
  description: string;
  occurredAt: string;
}

export type FollowUpStatus = "Pending" | "Completed" | "Cancelled";

export interface FollowUp {
  id: ID;
  prospectId: ID;
  opportunityId: ID;
  ownerId: ID;
  dueAt: string;
  notes: string;
  status: FollowUpStatus;
  completedAt?: string | null;
}

export const MEETING_TYPES = [
  "Sales Meeting",
  "Discovery Call",
  "Demo",
  "Consultation",
  "Other",
] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

export const MEETING_STATUSES = [
  "Scheduled",
  "Completed",
  "Rescheduled",
  "Cancelled",
  "No Show",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface Meeting {
  id: ID;
  prospectId: ID;
  opportunityId: ID;
  ownerId: ID;
  type: MeetingType;
  scheduledAt: string;
  status: MeetingStatus;
  notes: string;
  nextAction: string;
}

export const PROPOSAL_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Negotiation",
  "Accepted",
  "Rejected",
  "Expired",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface Proposal {
  id: ID;
  prospectId: ID;
  opportunityId: ID;
  serviceTypeId: ID;
  ownerId: ID;
  sentAt: string;
  amount: number;
  status: ProposalStatus;
  followUpAt?: string | null;
  notes: string;
}

export interface Deal {
  id: ID;
  prospectId: ID;
  opportunityId: ID;
  serviceTypeId: ID;
  outreachTypeId: ID;
  ownerId: ID;
  closedAt: string;
  value: number;
  notes: string;
}

export const TARGET_METRICS = [
  "outreach",
  "replies",
  "meetings",
  "discoveryCalls",
  "proposals",
  "closed",
] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];

export const TARGET_METRIC_LABELS: Record<TargetMetric, string> = {
  outreach: "Outreach",
  replies: "Replies",
  meetings: "Meetings",
  discoveryCalls: "Discovery Calls",
  proposals: "Proposals",
  closed: "Closed Deals",
};

export const TARGET_TIERS = ["minimum", "average", "stretch"] as const;
export type TargetTier = (typeof TARGET_TIERS)[number];

export const TARGET_TIER_LABELS: Record<TargetTier, string> = {
  minimum: "Minimum",
  average: "Average",
  stretch: "Stretch",
};

/** All targets are weekly, and scoped to one service. */
export interface Target {
  id: ID;
  userId: ID;
  serviceTypeId: ID;
  metric: TargetMetric;
  minimum: number;
  average: number;
  stretch: number;
  effectiveFrom: string;
  updatedAt: string;
}

/** Weekly outreach-volume target for one team member, one service, on one outreach channel. */
export interface OutreachTypeTarget {
  id: ID;
  userId: ID;
  serviceTypeId: ID;
  outreachTypeId: ID;
  minimum: number;
  average: number;
  stretch: number;
  updatedAt: string;
}

export interface Notification {
  id: ID;
  title: string;
  body: string;
  kind: "followup" | "meeting" | "proposal" | "target" | "reply";
  createdAt: string;
  read: boolean;
}

export interface Database {
  version: number;
  users: User[];
  outreachTypes: OutreachType[];
  serviceTypes: ServiceType[];
  leadSources: LeadSource[];
  prospects: Prospect[];
  opportunities: Opportunity[];
  outreach: Outreach[];
  activities: Activity[];
  followUps: FollowUp[];
  meetings: Meeting[];
  proposals: Proposal[];
  deals: Deal[];
  targets: Target[];
  notifications: Notification[];
  currentUserId: ID;
}
