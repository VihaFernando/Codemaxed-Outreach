import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { ProspectDialog } from "@/components/app/ProspectDialog";
import { FilterSelect } from "./outreach";
import { useProspects, useDeleteProspect } from "@/lib/data/prospects";
import {
  useOpportunities,
  getOpportunities,
  prospectStatus,
  prospectValue,
} from "@/lib/data/opportunities";
import { useOutreach, lastOutreachAt } from "@/lib/data/outreach";
import { useFollowUps, nextFollowUpAt } from "@/lib/data/followUps";
import { useProfiles, useServiceTypes, getSalesUsers, nameOf } from "@/lib/data/referenceData";
import { formatCurrency, formatDate } from "@/lib/data/dates";
import type { Prospect } from "@/lib/data/types";

export const Route = createFileRoute("/prospects/")({
  head: () => ({
    meta: [
      { title: "Prospects — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Company profiles, owners, pipeline status and deal values for every prospect.",
      },
      { property: "og:title", content: "Prospects — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Company profiles, owners, pipeline status and deal values for every prospect.",
      },
    ],
  }),
  component: ProspectsPage,
});

const PAGE_SIZE = 12;

function ProspectsPage() {
  const { data: prospects = [] } = useProspects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: outreach = [] } = useOutreach();
  const { data: followUps = [] } = useFollowUps();
  const { data: users = [] } = useProfiles();
  const { data: serviceTypes = [] } = useServiceTypes();
  const deleteProspect = useDeleteProspect();
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [service, setService] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | undefined>(undefined);

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = prospects.filter((p) => {
      if (owner !== "all" && p.ownerId !== owner) return false;
      if (
        service !== "all" &&
        !getOpportunities(opportunities, p.id).some((o) => o.serviceTypeId === service)
      )
        return false;
      if (!q) return true;
      return [p.company, p.contactPerson, p.email, p.phone, p.website, p.linkedinUrl, p.location]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
    list = list.slice().sort((a, b) => {
      if (sort === "company") return a.company.localeCompare(b.company);
      if (sort === "value")
        return prospectValue(opportunities, b.id) - prospectValue(opportunities, a.id);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [prospects, opportunities, query, owner, service, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        description={`${rows.length} compan${rows.length === 1 ? "y" : "ies"} in your database.`}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Add Prospect
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Search company, contact, email, phone, website…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <FilterSelect
            value={owner}
            onChange={(v) => {
              setOwner(v);
              setPage(0);
            }}
            label="All owners"
            options={getSalesUsers(users).map((u) => ({ value: u.id, label: u.name }))}
          />
          <FilterSelect
            value={service}
            onChange={(v) => {
              setService(v);
              setPage(0);
            }}
            label="All services"
            options={serviceTypes.map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            value={sort}
            onChange={setSort}
            label="Sort: recently added"
            options={[
              { value: "recent", label: "Recently added" },
              { value: "company", label: "Company A–Z" },
              { value: "value", label: "Highest deal value" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-2">
          {visible.length === 0 ? (
            <EmptyState title="No prospects match your filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Last outreach</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Next follow-up</th>
                    <th className="px-3 py-2 text-right font-medium">Deal value</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const services = getOpportunities(opportunities, p.id)
                      .map((o) => nameOf(serviceTypes, o.serviceTypeId))
                      .join(", ");
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-3 py-2 font-medium">
                          <Link
                            to="/prospects/$prospectId"
                            params={{ prospectId: p.id }}
                            className="hover:text-primary hover:underline"
                          >
                            {p.company}
                          </Link>
                          <p className="text-xs font-normal text-muted-foreground">{p.location}</p>
                        </td>
                        <td className="px-3 py-2">
                          {p.contactPerson}
                          <p className="text-xs text-muted-foreground">{p.jobTitle}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{services || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {nameOf(users, p.ownerId)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {formatDate(lastOutreachAt(outreach, p.id)) || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={prospectStatus(opportunities, p.id)} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {formatDate(nextFollowUpAt(followUps, p.id)) || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right numeric">
                          {formatCurrency(prospectValue(opportunities, p.id))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <Button asChild variant="ghost" size="icon" aria-label="View prospect">
                            <Link to="/prospects/$prospectId" params={{ prospectId: p.id }}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit prospect"
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Delete prospect">
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {p.company}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This deletes the company along with its outreach, meetings,
                                  proposals and deals. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteProspect.mutate(p.id, {
                                      onSuccess: () => toast.success("Prospect deleted"),
                                      onError: (err) =>
                                        toast.error(
                                          err instanceof Error
                                            ? err.message
                                            : "Failed to delete prospect",
                                        ),
                                    });
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {current + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <ProspectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        {...(editing ? { prospect: editing } : {})}
      />
    </div>
  );
}
