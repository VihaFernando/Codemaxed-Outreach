import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { FilterSelect } from "./outreach";
import { useOpportunities, useUpdateOpportunity } from "@/lib/data/opportunities";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { useProfiles, useServiceTypes, getSalesUsers, nameOf } from "@/lib/data/referenceData";
import { useOutreach, lastOutreachAt } from "@/lib/data/outreach";
import { useFollowUps, nextFollowUpAt } from "@/lib/data/followUps";
import { formatCurrency, formatDate } from "@/lib/data/dates";
import type { Opportunity, OutreachStatus } from "@/lib/data/types";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Drag opportunities between pipeline stages and watch every metric update.",
      },
      { property: "og:title", content: "Pipeline — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Drag opportunities between pipeline stages and watch every metric update.",
      },
    ],
  }),
  component: PipelinePage,
});

const COLUMNS: Array<{ title: string; statuses: OutreachStatus[]; primary: OutreachStatus }> = [
  {
    title: "Sent",
    statuses: ["Draft", "Sent", "No Response", "Follow-up Required"],
    primary: "Sent",
  },
  { title: "Replied", statuses: ["Replied"], primary: "Replied" },
  { title: "Qualified", statuses: ["Qualified"], primary: "Qualified" },
  {
    title: "Meeting / Discovery",
    statuses: ["Meeting Booked", "Discovery Call"],
    primary: "Meeting Booked",
  },
  { title: "Proposal", statuses: ["Proposal Sent"], primary: "Proposal Sent" },
  { title: "Negotiation", statuses: ["Negotiation"], primary: "Negotiation" },
  { title: "Closed", statuses: ["Closed"], primary: "Closed" },
  {
    title: "Not Interested / Lost",
    statuses: ["Not Interested", "Lost"],
    primary: "Not Interested",
  },
];

function PipelinePage() {
  const { data: opportunitiesAll = [] } = useOpportunities();
  const { data: prospects = [] } = useProspects();
  const { data: users = [] } = useProfiles();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: outreach = [] } = useOutreach();
  const { data: followUps = [] } = useFollowUps();
  const updateOpportunity = useUpdateOpportunity();
  const [owner, setOwner] = useState("all");
  const [service, setService] = useState("all");
  const [dragging, setDragging] = useState<string | null>(null);

  const opportunities = useMemo(
    () =>
      opportunitiesAll.filter(
        (o) =>
          (owner === "all" || o.ownerId === owner) &&
          (service === "all" || o.serviceTypeId === service),
      ),
    [opportunitiesAll, owner, service],
  );

  function move(opportunityId: string, status: OutreachStatus) {
    const opp = opportunitiesAll.find((o) => o.id === opportunityId);
    if (!opp || opp.status === status) return;
    updateOpportunity.mutate(
      { id: opportunityId, patch: { status } },
      {
        onSuccess: () => toast.success(`Moved to ${status}`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to move opportunity"),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Drag a card to a new stage — the record, funnel and analytics all update."
        actions={
          <div className="flex gap-2">
            <div className="w-44">
              <FilterSelect
                value={owner}
                onChange={setOwner}
                label="All owners"
                options={getSalesUsers(users).map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
            <div className="w-44">
              <FilterSelect
                value={service}
                onChange={setService}
                label="All services"
                options={serviceTypes.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
          </div>
        }
      />

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((col) => {
            const items: Opportunity[] = opportunities.filter((o) =>
              col.statuses.includes(o.status),
            );
            const value = items.reduce((s, o) => s + o.dealValue, 0);
            return (
              <div
                key={col.title}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging) move(dragging, col.primary);
                  setDragging(null);
                }}
                className="flex w-72 flex-col rounded-lg border border-border bg-muted/40"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{col.title}</p>
                    <p className="numeric text-xs text-muted-foreground">{formatCurrency(value)}</p>
                  </div>
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Nothing here yet.
                    </p>
                  ) : (
                    items.map((o) => {
                      const p = getProspect(prospects, o.prospectId);
                      return (
                        <Card
                          key={o.id}
                          draggable
                          onDragStart={() => setDragging(o.id)}
                          onDragEnd={() => setDragging(null)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <CardContent className="space-y-1 p-3">
                            <Link
                              to="/prospects/$prospectId"
                              params={{ prospectId: o.prospectId }}
                              className="text-sm font-medium hover:text-primary hover:underline"
                            >
                              {p?.company ?? "Unknown"}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {p?.contactPerson} · {nameOf(serviceTypes, o.serviceTypeId)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Owner {nameOf(users, o.ownerId)}
                            </p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="numeric text-sm font-semibold">
                                {formatCurrency(o.dealValue)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(lastOutreachAt(outreach, o.prospectId)) ||
                                  "No outreach"}
                              </span>
                            </div>
                            {nextFollowUpAt(followUps, o.prospectId) ? (
                              <p className="text-[11px] text-muted-foreground">
                                Next follow-up {formatDate(nextFollowUpAt(followUps, o.prospectId))}
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
