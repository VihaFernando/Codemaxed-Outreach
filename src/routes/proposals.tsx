import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, Trash2 } from "lucide-react";
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
import { ProposalDialog } from "@/components/app/ProposalDialog";
import { FilterSelect } from "./outreach";
import { useProposals, useDeleteProposal, useUpdateProposal } from "@/lib/data/proposals";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { useServiceTypes, useProfiles, getSalesUsers, nameOf } from "@/lib/data/referenceData";
import { formatCurrency, formatDate, inRange } from "@/lib/data/dates";
import { useAppUI } from "@/lib/ui-context";
import { PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/data/types";

export const Route = createFileRoute("/proposals")({
  head: () => ({
    meta: [
      { title: "Proposals — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Proposal values, statuses and follow-ups across every service line.",
      },
      { property: "og:title", content: "Proposals — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Proposal values, statuses and follow-ups across every service line.",
      },
    ],
  }),
  component: ProposalsPage,
});

function ProposalsPage() {
  const { data: proposals = [] } = useProposals();
  const { data: prospects = [] } = useProspects();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: users = [] } = useProfiles();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const { range } = useAppUI();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState("all");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      proposals.filter(
        (p) =>
          inRange(p.sentAt, range) &&
          (owner === "all" || p.ownerId === owner) &&
          (service === "all" || p.serviceTypeId === service) &&
          (status === "all" || p.status === status),
      ),
    [proposals, range, owner, service, status],
  );

  const totalValue = rows.reduce((s, p) => s + p.amount, 0);
  const accepted = rows.filter((p) => p.status === "Accepted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        description="Every proposal sent, with live status and value."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Add Proposal
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Proposals in period" value={rows.length} icon={FileText} />
        <MetricCard label="Total proposed value" value={formatCurrency(totalValue)} />
        <MetricCard label="Accepted" value={accepted} tone="success" />
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
            value={service}
            onChange={setService}
            label="All services"
            options={serviceTypes.map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            label="All statuses"
            options={PROPOSAL_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-2">
          {rows.length === 0 ? (
            <EmptyState title="No proposals found." icon={FileText} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Sent</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Follow-up</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const prospect = getProspect(prospects, p.prospectId);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {formatDate(p.sentAt)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Link
                            to="/prospects/$prospectId"
                            params={{ prospectId: p.prospectId }}
                            className="hover:text-primary hover:underline"
                          >
                            {prospect?.company ?? "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {prospect?.contactPerson ?? "—"}
                        </td>
                        <td className="px-3 py-2">{nameOf(serviceTypes, p.serviceTypeId)}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {nameOf(users, p.ownerId)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right numeric">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={p.status}
                            onValueChange={(v) => {
                              updateProposal.mutate(
                                { proposal: p, patch: { status: v as ProposalStatus } },
                                {
                                  onSuccess: () => toast.success(`Proposal marked ${v}`),
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
                              {PROPOSAL_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {p.followUpAt ? formatDate(p.followUpAt) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete proposal"
                            onClick={() => {
                              deleteProposal.mutate(p.id, {
                                onSuccess: () => toast.success("Proposal deleted"),
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

      <ProposalDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
