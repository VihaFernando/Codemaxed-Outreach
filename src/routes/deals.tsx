import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { MetricCard } from "@/components/app/MetricCard";
import { FilterSelect } from "./outreach";
import { useDeals } from "@/lib/data/deals";
import { useProspects, getProspect } from "@/lib/data/prospects";
import {
  useServiceTypes,
  useOutreachTypes,
  useProfiles,
  getSalesUsers,
  nameOf,
} from "@/lib/data/referenceData";
import { groupSum } from "@/lib/data/analytics";
import { formatCurrency, formatDate, inRange } from "@/lib/data/dates";
import { useAppUI } from "@/lib/ui-context";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Closed Deals — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Closed revenue by service, team member and acquisition platform.",
      },
      { property: "og:title", content: "Closed Deals — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Closed revenue by service, team member and acquisition platform.",
      },
    ],
  }),
  component: DealsPage,
});

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; value: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 ? (
          <EmptyState title="No closed deals in this period." />
        ) : (
          rows.map((r) => (
            <div key={r.name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="numeric font-medium">{formatCurrency(r.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DealsPage() {
  const { data: deals = [] } = useDeals();
  const { data: prospects = [] } = useProspects();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: outreachTypes = [] } = useOutreachTypes();
  const { data: users = [] } = useProfiles();
  const { range } = useAppUI();
  const [owner, setOwner] = useState("all");
  const [service, setService] = useState("all");

  const rows = useMemo(
    () =>
      deals.filter(
        (d) =>
          inRange(d.closedAt, range) &&
          (owner === "all" || d.ownerId === owner) &&
          (service === "all" || d.serviceTypeId === service),
      ),
    [deals, range, owner, service],
  );

  const revenue = rows.reduce((s, d) => s + d.value, 0);
  const average = rows.length ? Math.round(revenue / rows.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Closed deals"
        description="Won business and revenue for the selected period."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Closed deals" value={rows.length} icon={Trophy} tone="success" />
        <MetricCard label="Closed revenue" value={formatCurrency(revenue)} />
        <MetricCard label="Average deal value" value={formatCurrency(average)} />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
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
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown
          title="Revenue by service"
          rows={groupSum(
            rows,
            (d) => nameOf(serviceTypes, d.serviceTypeId),
            (d) => d.value,
          )}
        />
        <Breakdown
          title="Revenue by team member"
          rows={groupSum(
            rows,
            (d) => nameOf(users, d.ownerId),
            (d) => d.value,
          )}
        />
        <Breakdown
          title="Revenue by acquisition platform"
          rows={groupSum(
            rows,
            (d) => nameOf(outreachTypes, d.outreachTypeId),
            (d) => d.value,
          )}
        />
      </div>

      <Card>
        <CardContent className="p-0 sm:p-2">
          {rows.length === 0 ? (
            <EmptyState title="No closed deals in this period." icon={Trophy} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Closed</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Contact</th>
                    <th className="px-3 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Platform</th>
                    <th className="px-3 py-2 text-right font-medium">Deal value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const p = getProspect(prospects, d.prospectId);
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                          {formatDate(d.closedAt)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <Link
                            to="/prospects/$prospectId"
                            params={{ prospectId: d.prospectId }}
                            className="hover:text-primary hover:underline"
                          >
                            {p?.company ?? "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {p?.contactPerson ?? "—"}
                        </td>
                        <td className="px-3 py-2">{nameOf(serviceTypes, d.serviceTypeId)}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {nameOf(users, d.ownerId)}
                        </td>
                        <td className="px-3 py-2">{nameOf(outreachTypes, d.outreachTypeId)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right numeric font-medium text-success">
                          {formatCurrency(d.value)}
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
    </div>
  );
}
