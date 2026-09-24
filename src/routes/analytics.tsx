import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { FunnelView } from "@/components/app/FunnelView";
import { EmptyState } from "@/components/app/EmptyState";
import { FilterSelect } from "./outreach";
import {
  useAnalyticsBundle,
  filterOutreach,
  getFunnel,
  getTeamPerformance,
  getTrend,
  groupCount,
  groupSum,
} from "@/lib/data/analytics";
import { useFollowUps } from "@/lib/data/followUps";
import { getSalesUsers, nameOf } from "@/lib/data/referenceData";
import { useAppUI } from "@/lib/ui-context";
import { formatCompactCurrency, formatCurrency, inRange } from "@/lib/data/dates";
import { OUTREACH_STATUSES } from "@/lib/data/types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Outreach, reply, meeting, proposal and revenue analytics with team performance.",
      },
      { property: "og:title", content: "Analytics — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Outreach, reply, meeting, proposal and revenue analytics with team performance.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

type Datum = { name: string; value: number };

function BarBlock({ data, currency }: { data: Datum[]; currency?: boolean }) {
  if (data.length === 0) return <EmptyState title="No data for these filters." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => (currency ? formatCompactCurrency(Number(v)) : String(v))}
        />
        <Tooltip formatter={(v) => (currency ? formatCurrency(Number(v)) : String(v))} />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DonutBlock({ data }: { data: Datum[] }) {
  if (data.length === 0) return <EmptyState title="No data for these filters." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AnalyticsPage() {
  const { data: bundle, isLoading } = useAnalyticsBundle();
  const { data: followUpsData, isLoading: followUpsLoading } = useFollowUps();
  const { range } = useAppUI();
  const [owner, setOwner] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");

  const filters = useMemo(
    () => ({
      ...(owner !== "all" ? { userIds: [owner] } : {}),
      outreachTypeId: platform,
      serviceTypeId: service,
      status: status === "all" ? ("all" as const) : (status as (typeof OUTREACH_STATUSES)[number]),
    }),
    [owner, platform, service, status],
  );

  if (!bundle || isLoading || followUpsLoading || !followUpsData) return null;

  const outreach = filterOutreach(bundle, range, filters);
  const replies = outreach.filter((o) => o.repliedAt);
  const meetings = bundle.meetings.filter(
    (m) => inRange(m.scheduledAt, range) && (owner === "all" || m.ownerId === owner),
  );
  const proposals = bundle.proposals.filter(
    (p) => inRange(p.sentAt, range) && (owner === "all" || p.ownerId === owner),
  );
  const deals = bundle.deals.filter(
    (d) => inRange(d.closedAt, range) && (owner === "all" || d.ownerId === owner),
  );
  const followUps = followUpsData.filter((f) => owner === "all" || f.ownerId === owner);
  const trend = getTrend(bundle, range, filters);
  const funnel = getFunnel(bundle, range, filters);
  const team = getTeamPerformance(bundle, range, {
    outreachTypeId: platform,
    serviceTypeId: service,
  });

  const platformOf = (id: string) => nameOf(bundle.outreachTypes, id);
  const serviceOf = (id: string) => nameOf(bundle.serviceTypes, id);
  const meetingPlatform = (prospectId: string) => {
    const last = bundle.outreach.filter((o) => o.prospectId === prospectId).at(-1);
    return last ? platformOf(last.outreachTypeId) : "Unknown";
  };

  const followUpCompletion = [
    { name: "Completed", value: followUps.filter((f) => f.status === "Completed").length },
    { name: "Pending", value: followUps.filter((f) => f.status === "Pending").length },
    { name: "Cancelled", value: followUps.filter((f) => f.status === "Cancelled").length },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Every chart is calculated from live records in the selected period."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            value={owner}
            onChange={setOwner}
            label="All team members"
            options={getSalesUsers(bundle.users).map((u) => ({ value: u.id, label: u.name }))}
          />
          <FilterSelect
            value={platform}
            onChange={setPlatform}
            label="All platforms"
            options={bundle.outreachTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
          <FilterSelect
            value={service}
            onChange={setService}
            label="All services"
            options={bundle.serviceTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            label="All statuses"
            options={OUTREACH_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Outreach by platform">
          <BarBlock data={groupCount(outreach, (o) => platformOf(o.outreachTypeId))} />
        </ChartCard>
        <ChartCard title="Outreach by service">
          <DonutBlock data={groupCount(outreach, (o) => serviceOf(o.serviceTypeId))} />
        </ChartCard>
        <ChartCard title="Replies by platform">
          <BarBlock data={groupCount(replies, (o) => platformOf(o.outreachTypeId))} />
        </ChartCard>
        <ChartCard title="Meetings by platform">
          <BarBlock data={groupCount(meetings, (m) => meetingPlatform(m.prospectId))} />
        </ChartCard>
        <ChartCard title="Proposals by service">
          <BarBlock data={groupCount(proposals, (p) => serviceOf(p.serviceTypeId))} />
        </ChartCard>
        <ChartCard title="Closed deals by service">
          <DonutBlock data={groupCount(deals, (d) => serviceOf(d.serviceTypeId))} />
        </ChartCard>
        <ChartCard title="Closed revenue by service">
          <BarBlock
            data={groupSum(
              deals,
              (d) => serviceOf(d.serviceTypeId),
              (d) => d.value,
            )}
            currency
          />
        </ChartCard>
        <ChartCard title="Team performance — outreach">
          <BarBlock
            data={team.map((t) => ({ name: t.user.name.split(" ")[0]!, value: t.outreach }))}
          />
        </ChartCard>
        <ChartCard title="Outreach & replies trend">
          {trend.length === 0 ? (
            <EmptyState title="No activity in this period." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="outreach"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="replies"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard title="Lead status distribution">
          <BarBlock data={groupCount(bundle.opportunities, (o) => o.status)} />
        </ChartCard>
        <ChartCard title="Follow-up completion">
          <DonutBlock data={followUpCompletion} />
        </ChartCard>
        <Card>
          <CardHeader>
            <CardTitle>Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelView stages={funnel} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Team member</th>
                  <th className="px-3 py-2 text-right font-medium">Outreach</th>
                  <th className="px-3 py-2 text-right font-medium">Replies</th>
                  <th className="px-3 py-2 text-right font-medium">Reply rate</th>
                  <th className="px-3 py-2 text-right font-medium">Meetings</th>
                  <th className="px-3 py-2 text-right font-medium">Meeting rate</th>
                  <th className="px-3 py-2 text-right font-medium">Proposals</th>
                  <th className="px-3 py-2 text-right font-medium">Closed</th>
                  <th className="px-3 py-2 text-right font-medium">Close rate</th>
                  <th className="px-3 py-2 text-right font-medium">Pipeline</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.user.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{t.user.name}</td>
                    <td className="px-3 py-2 text-right numeric">{t.outreach}</td>
                    <td className="px-3 py-2 text-right numeric">{t.replies}</td>
                    <td className="px-3 py-2 text-right numeric">{t.replyRate}%</td>
                    <td className="px-3 py-2 text-right numeric">{t.meetings}</td>
                    <td className="px-3 py-2 text-right numeric">{t.meetingRate}%</td>
                    <td className="px-3 py-2 text-right numeric">{t.proposals}</td>
                    <td className="px-3 py-2 text-right numeric">{t.closed}</td>
                    <td className="px-3 py-2 text-right numeric">{t.closeRate}%</td>
                    <td className="px-3 py-2 text-right numeric">
                      {formatCurrency(t.pipelineValue)}
                    </td>
                    <td className="px-3 py-2 text-right numeric">{formatCurrency(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
