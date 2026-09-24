import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  FileText,
  Pencil,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EmptyState } from "@/components/app/EmptyState";
import { ProspectDialog } from "@/components/app/ProspectDialog";
import { OutreachDialog } from "@/components/app/OutreachDialog";
import { MeetingDialog } from "@/components/app/MeetingDialog";
import { ProposalDialog } from "@/components/app/ProposalDialog";
import { FollowUpDialog } from "@/components/app/FollowUpDialog";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useProspects, getProspect } from "@/lib/data/prospects";
import {
  useOpportunities,
  getOpportunities,
  prospectStatus,
  prospectValue,
} from "@/lib/data/opportunities";
import { useOutreach, getProspectOutreach } from "@/lib/data/outreach";
import { useMeetings } from "@/lib/data/meetings";
import { useProposals } from "@/lib/data/proposals";
import { useActivities, useAddNote } from "@/lib/data/activities";
import {
  useProfiles,
  useLeadSources,
  useServiceTypes,
  useOutreachTypes,
  nameOf,
} from "@/lib/data/referenceData";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/data/dates";

export const Route = createFileRoute("/prospects/$prospectId")({
  head: () => ({
    meta: [
      { title: "Prospect profile — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Company profile, outreach history, meetings, proposals and activity timeline.",
      },
      { property: "og:title", content: "Prospect profile — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Company profile, outreach history, meetings, proposals and activity timeline.",
      },
    ],
  }),
  component: ProspectDetail,
});

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  const isUrl = value.startsWith("http");
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          {value.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  );
}

function ProspectDetail() {
  const { prospectId } = Route.useParams();
  const { data: me } = useCurrentUser();
  const { data: prospects = [] } = useProspects();
  const { data: opportunitiesAll = [] } = useOpportunities();
  const { data: outreachAll = [] } = useOutreach();
  const { data: meetingsAll = [] } = useMeetings();
  const { data: proposalsAll = [] } = useProposals();
  const { data: users = [] } = useProfiles();
  const { data: leadSources = [] } = useLeadSources();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: outreachTypes = [] } = useOutreachTypes();
  const { data: activities = [] } = useActivities(prospectId);
  const addNote = useAddNote();
  const prospect = getProspect(prospects, prospectId);
  const [edit, setEdit] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!prospect) {
    return (
      <EmptyState
        title="Prospect not found."
        description="It may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/prospects">Back to prospects</Link>
          </Button>
        }
      />
    );
  }

  const opportunities = getOpportunities(opportunitiesAll, prospect.id);
  const outreach = getProspectOutreach(outreachAll, prospect.id);
  const meetings = meetingsAll.filter((m) => m.prospectId === prospect.id);
  const proposals = proposalsAll.filter((p) => p.prospectId === prospect.id);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/prospects">
          <ArrowLeft className="size-4" /> All prospects
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{prospect.company}</h1>
              <StatusBadge status={prospectStatus(opportunitiesAll, prospect.id)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {prospect.contactPerson}
              {prospect.jobTitle ? ` · ${prospect.jobTitle}` : ""} · Owner{" "}
              {nameOf(users, prospect.ownerId)}
            </p>
            <p className="numeric text-sm font-semibold">
              Potential value {formatCurrency(prospectValue(opportunitiesAll, prospect.id))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setOutreachOpen(true)}>
              <Send className="size-4" /> Add Outreach
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFollowUpOpen(true)}>
              <CalendarClock className="size-4" /> Follow-up
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMeetingOpen(true)}>
              <CalendarDays className="size-4" /> Meeting
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProposalOpen(true)}>
              <FileText className="size-4" /> Proposal
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Company profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Contact person" value={prospect.contactPerson} />
              <Detail label="Job title" value={prospect.jobTitle} />
              <Detail label="Email" value={prospect.email} />
              <Detail label="Phone" value={prospect.phone} />
              <Detail label="Website" value={prospect.website} />
              <Detail label="LinkedIn" value={prospect.linkedinUrl} />
              <Detail label="Facebook" value={prospect.facebookUrl} />
              <Detail label="Instagram" value={prospect.instagramUrl} />
              <Detail label="Google Business" value={prospect.googleBusinessUrl} />
              <Detail label="Other link" value={prospect.otherUrl} />
              <Detail label="Industry" value={prospect.industry} />
              <Detail label="Location" value={prospect.location} />
              <Detail label="Lead source" value={nameOf(leadSources, prospect.leadSourceId)} />
              <Detail label="Created" value={formatDate(prospect.createdAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {opportunities.length === 0 ? (
                <EmptyState title="No service opportunities yet." />
              ) : (
                opportunities.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{nameOf(serviceTypes, o.serviceTypeId)}</p>
                      <p className="text-xs text-muted-foreground">
                        Owner {nameOf(users, o.ownerId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="numeric text-sm">{formatCurrency(o.dealValue)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outreach" className="mt-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              {outreach.length === 0 ? (
                <EmptyState title="No outreach recorded for this company." />
              ) : (
                outreach.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {nameOf(outreachTypes, o.outreachTypeId)} ·{" "}
                        {nameOf(serviceTypes, o.serviceTypeId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(o.occurredAt)} · {nameOf(users, o.ownerId)}
                      </p>
                      {o.message ? (
                        <p className="mt-1 text-xs text-muted-foreground">{o.message}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {activities.length === 0 ? (
                <EmptyState title="No activity recorded yet." />
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" />
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(a.occurredAt)} · {nameOf(users, a.userId)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              {meetings.length === 0 ? (
                <EmptyState title="No meetings booked." />
              ) : (
                meetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{m.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.scheduledAt)} · {nameOf(users, m.ownerId)}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals" className="mt-4">
          <Card>
            <CardContent className="space-y-2 p-4">
              {proposals.length === 0 ? (
                <EmptyState title="No proposals found." />
              ) : (
                proposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{nameOf(serviceTypes, p.serviceTypeId)}</p>
                      <p className="text-xs text-muted-foreground">Sent {formatDate(p.sentAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="numeric">{formatCurrency(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              {prospect.notes ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm">{prospect.notes}</p>
              ) : null}
              <Textarea
                rows={4}
                placeholder="Add a note to this company's timeline…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                disabled={!note.trim() || !me || addNote.isPending}
                onClick={() => {
                  if (!me) return;
                  addNote.mutate(
                    { prospectId: prospect.id, description: note.trim(), actorId: me.id },
                    {
                      onSuccess: () => {
                        setNote("");
                        toast.success("Note added to the timeline");
                      },
                      onError: (err) =>
                        toast.error(err instanceof Error ? err.message : "Failed to add note"),
                    },
                  );
                }}
              >
                {addNote.isPending ? "Adding…" : "Add note"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProspectDialog open={edit} onOpenChange={setEdit} prospect={prospect} />
      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} prospectId={prospect.id} />
      <MeetingDialog open={meetingOpen} onOpenChange={setMeetingOpen} prospectId={prospect.id} />
      <ProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} prospectId={prospect.id} />
      <FollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} prospectId={prospect.id} />
    </div>
  );
}
