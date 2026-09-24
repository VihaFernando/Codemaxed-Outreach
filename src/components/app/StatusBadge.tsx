import { cn } from "@/lib/utils";
import type {
  FollowUpStatus,
  MeetingStatus,
  OutreachStatus,
  ProposalStatus,
} from "@/lib/data/types";

type AnyStatus = OutreachStatus | MeetingStatus | ProposalStatus | FollowUpStatus | string;

const TONE: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  Sent: "bg-info-soft text-info border-transparent",
  Scheduled: "bg-info-soft text-info border-transparent",
  Pending: "bg-warning-soft text-warning-foreground border-transparent",
  Viewed: "bg-info-soft text-info border-transparent",
  Replied: "bg-primary-soft text-primary border-transparent",
  Qualified: "bg-primary-soft text-primary border-transparent",
  "Meeting Booked": "bg-primary-soft text-primary border-transparent",
  "Discovery Call": "bg-primary-soft text-primary border-transparent",
  "Proposal Sent": "bg-warning-soft text-warning-foreground border-transparent",
  Negotiation: "bg-warning-soft text-warning-foreground border-transparent",
  Closed: "bg-success-soft text-success border-transparent",
  Completed: "bg-success-soft text-success border-transparent",
  Accepted: "bg-success-soft text-success border-transparent",
  "Not Interested": "bg-danger-soft text-destructive border-transparent",
  Rejected: "bg-danger-soft text-destructive border-transparent",
  Lost: "bg-danger-soft text-destructive border-transparent",
  Cancelled: "bg-danger-soft text-destructive border-transparent",
  "No Show": "bg-danger-soft text-destructive border-transparent",
  "No Response": "bg-muted text-muted-foreground border-border",
  Expired: "bg-muted text-muted-foreground border-border",
  Rescheduled: "bg-warning-soft text-warning-foreground border-transparent",
  "Follow-up Required": "bg-warning-soft text-warning-foreground border-transparent",
};

export function StatusBadge({ status, className }: { status: AnyStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {status}
    </span>
  );
}
