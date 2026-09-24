import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { MeetingDialog } from "@/components/app/MeetingDialog";
import { FilterSelect } from "./outreach";
import { useMeetings, useDeleteMeeting, useUpdateMeeting } from "@/lib/data/meetings";
import { useOpportunities, getOpportunity } from "@/lib/data/opportunities";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { useServiceTypes, useProfiles, getSalesUsers, nameOf } from "@/lib/data/referenceData";
import { formatDateTime, inRange } from "@/lib/data/dates";
import { useAppUI } from "@/lib/ui-context";
import { MEETING_STATUSES, MEETING_TYPES, type MeetingStatus } from "@/lib/data/types";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Sales meetings and discovery calls with status tracking and next actions.",
      },
      { property: "og:title", content: "Meetings — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Sales meetings and discovery calls with status tracking and next actions.",
      },
    ],
  }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { data: meetings = [] } = useMeetings();
  const { data: opportunities = [] } = useOpportunities();
  const { data: prospects = [] } = useProspects();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: users = [] } = useProfiles();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const { range } = useAppUI();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      meetings.filter(
        (m) =>
          inRange(m.scheduledAt, range) &&
          (owner === "all" || m.ownerId === owner) &&
          (type === "all" || m.type === type) &&
          (status === "all" || m.status === status),
      ),
    [meetings, range, owner, type, status],
  );

  const discovery = rows.filter((m) => m.type === "Discovery Call").length;
  const completed = rows.filter((m) => m.status === "Completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meetings"
        description="AI services qualify through a Discovery Call; other services use a Sales Meeting."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add Meeting
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Meetings in period" value={rows.length} icon={CalendarDays} />
        <MetricCard label="Discovery calls" value={discovery} />
        <MetricCard label="Completed" value={completed} tone="success" />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <FilterSelect
            value={owner}
            onChange={setOwner}
            label="All owners"
            options={getSalesUsers(users).map((u) => ({ value: u.id, label: u.name }))}
          />
          <FilterSelect
            value={type}
            onChange={setType}
            label="All meeting types"
            options={MEETING_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            label="All statuses"
            options={MEETING_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-2">
          {rows.length === 0 ? (
            <EmptyState title="No meetings match your filters." icon={CalendarDays} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Next action</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const p = getProspect(prospects, m.prospectId);
                    const opp = getOpportunity(opportunities, m.opportunityId);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {formatDateTime(m.scheduledAt)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Link
                            to="/prospects/$prospectId"
                            params={{ prospectId: m.prospectId }}
                            className="hover:text-primary hover:underline"
                          >
                            {p?.company ?? "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {p?.contactPerson ?? "—"}
                        </td>
                        <td className="px-3 py-2">{m.type}</td>
                        <td className="px-3 py-2">
                          {opp ? nameOf(serviceTypes, opp.serviceTypeId) : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {nameOf(users, m.ownerId)}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={m.status}
                            onValueChange={(v) => {
                              updateMeeting.mutate(
                                { meeting: m, patch: { status: v as MeetingStatus } },
                                {
                                  onSuccess: () => toast.success(`Meeting marked ${v}`),
                                  onError: (err) =>
                                    toast.error(
                                      err instanceof Error ? err.message : "Failed to update",
                                    ),
                                },
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEETING_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{m.nextAction || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete meeting"
                            onClick={() => {
                              deleteMeeting.mutate(m.id, {
                                onSuccess: () => toast.success("Meeting deleted"),
                                onError: (err) =>
                                  toast.error(
                                    err instanceof Error ? err.message : "Failed to delete",
                                  ),
                              });
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MeetingDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
