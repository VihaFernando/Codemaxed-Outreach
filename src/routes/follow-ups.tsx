import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { FollowUpDialog } from "@/components/app/FollowUpDialog";
import { FilterSelect } from "./outreach";
import { useFollowUps, useCompleteFollowUp } from "@/lib/data/followUps";
import { useOpportunities, getOpportunity } from "@/lib/data/opportunities";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { useOutreach, getProspectOutreach } from "@/lib/data/outreach";
import {
  useOutreachTypes,
  useServiceTypes,
  useProfiles,
  getSalesUsers,
  nameOf,
} from "@/lib/data/referenceData";
import { addDays, formatDateTime, startOfWeek } from "@/lib/data/dates";
import type { FollowUp } from "@/lib/data/types";

export const Route = createFileRoute("/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Overdue, today, tomorrow and upcoming follow-ups for the outreach team.",
      },
      { property: "og:title", content: "Follow-ups — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Overdue, today, tomorrow and upcoming follow-ups for the outreach team.",
      },
    ],
  }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const { data: followUps = [] } = useFollowUps();
  const { data: opportunities = [] } = useOpportunities();
  const { data: prospects = [] } = useProspects();
  const { data: outreach = [] } = useOutreach();
  const { data: outreachTypes = [] } = useOutreachTypes();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: users = [] } = useProfiles();
  const completeFollowUp = useCompleteFollowUp();
  const [owner, setOwner] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp | undefined>(undefined);

  const groups = useMemo(() => {
    const pending = followUps.filter(
      (f) => f.status === "Pending" && (owner === "all" || f.ownerId === owner),
    );
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTomorrow = addDays(startToday, 1);
    const startDayAfter = addDays(startToday, 2);
    const endOfWeek = addDays(startOfWeek(now), 7);

    const buckets: Array<{ key: string; title: string; items: FollowUp[] }> = [
      { key: "overdue", title: "Overdue", items: [] },
      { key: "today", title: "Today", items: [] },
      { key: "tomorrow", title: "Tomorrow", items: [] },
      { key: "week", title: "This week", items: [] },
      { key: "upcoming", title: "Upcoming", items: [] },
    ];
    pending.forEach((f) => {
      const due = new Date(f.dueAt);
      if (due < startToday) buckets[0]!.items.push(f);
      else if (due < startTomorrow) buckets[1]!.items.push(f);
      else if (due < startDayAfter) buckets[2]!.items.push(f);
      else if (due < endOfWeek) buckets[3]!.items.push(f);
      else buckets[4]!.items.push(f);
    });
    buckets.forEach((b) => b.items.sort((a, c) => a.dueAt.localeCompare(c.dueAt)));
    return buckets;
  }, [followUps, owner]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Keep every promised touchpoint on schedule."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-48">
              <FilterSelect
                value={owner}
                onChange={setOwner}
                label="All owners"
                options={getSalesUsers(users).map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Schedule Follow-up
            </Button>
          </div>
        }
      />

      {groups.map((group) => (
        <Card
          key={group.key}
          className={group.key === "overdue" && group.items.length ? "border-warning/50" : ""}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {group.title}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {group.items.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.items.length === 0 ? (
              <EmptyState
                title={`No follow-ups ${group.title.toLowerCase()}.`}
                icon={CalendarClock}
              />
            ) : (
              group.items.map((f) => {
                const prospect = getProspect(prospects, f.prospectId);
                const opp = getOpportunity(opportunities, f.opportunityId);
                const last = getProspectOutreach(outreach, f.prospectId)[0];
                return (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/prospects/$prospectId"
                        params={{ prospectId: f.prospectId }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {prospect?.company ?? "Unknown company"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {prospect?.contactPerson} ·{" "}
                        {last ? nameOf(outreachTypes, last.outreachTypeId) : "No outreach yet"} ·{" "}
                        {opp ? nameOf(serviceTypes, opp.serviceTypeId) : "—"} ·{" "}
                        {nameOf(users, f.ownerId)}
                      </p>
                      {f.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{f.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {opp ? <StatusBadge status={opp.status} /> : null}
                      <span className="numeric text-xs text-muted-foreground">
                        {formatDateTime(f.dueAt)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(f);
                          setOpen(true);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          completeFollowUp.mutate(f, {
                            onSuccess: () => toast.success("Follow-up completed"),
                            onError: (err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Failed to complete",
                              ),
                          });
                        }}
                      >
                        <Check className="size-4" /> Complete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}

      <FollowUpDialog
        open={open}
        onOpenChange={setOpen}
        {...(editing ? { followUp: editing } : {})}
      />
    </div>
  );
}
