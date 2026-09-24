import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  MessageSquare,
  Send,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { MetricCard, TargetCard } from "@/components/app/MetricCard";
import { FunnelView } from "@/components/app/FunnelView";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useAppUI } from "@/lib/ui-context";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useAnalyticsBundle, getFunnel, getMetrics, getTargetProgress } from "@/lib/data/analytics";
import { useFollowUps } from "@/lib/data/followUps";
import { useMeetings } from "@/lib/data/meetings";
import { useOutreach } from "@/lib/data/outreach";
import { useProposals } from "@/lib/data/proposals";
import { useDeals } from "@/lib/data/deals";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { getSalesUsers, nameOf } from "@/lib/data/referenceData";
import {
  buildRange,
  formatCurrency,
  formatDate,
  formatDateTime,
  relativeDayLabel,
} from "@/lib/data/dates";
import { TARGET_METRIC_LABELS } from "@/lib/data/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content:
          "Daily outreach targets, pipeline funnel and team KPIs for the CodeMaxed sales team.",
      },
      { property: "og:title", content: "Dashboard — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content:
          "Daily outreach targets, pipeline funnel and team KPIs for the CodeMaxed sales team.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: bundle } = useAnalyticsBundle();
  const { data: me } = useCurrentUser();
  const { data: followUpsAll = [] } = useFollowUps();
  const { data: meetingsAll = [] } = useMeetings();
  const { data: outreachAll = [] } = useOutreach();
  const { data: proposalsAll = [] } = useProposals();
  const { data: dealsAll = [] } = useDeals();
  const { data: prospects = [] } = useProspects();
  const { range } = useAppUI();
  const [mode, setMode] = useState<"my" | "team">("my");
  const salesUsers = getSalesUsers(bundle?.users ?? []);
  const userIds = useMemo(
    () => (mode === "my" ? (me ? [me.id] : []) : salesUsers.map((u) => u.id)),
    [mode, me, salesUsers],
  );

  const today = buildRange("today");
  const todayMetrics = bundle ? getMetrics(bundle, today, { userIds }) : undefined;
  const rangeMetrics = bundle ? getMetrics(bundle, range, { userIds }) : undefined;
  const weeklyProgress = bundle ? getTargetProgress(bundle, "average", userIds) : [];
  const funnel = bundle ? getFunnel(bundle, range, { userIds }) : [];

  const mine = (ownerId: string) => userIds.includes(ownerId);
  const now = Date.now();

  const followUps = followUpsAll.filter((f) => f.status === "Pending" && mine(f.ownerId));
  const overdue = followUps.filter((f) => new Date(f.dueAt).getTime() < now);
  const dueToday = followUps.filter((f) => relativeDayLabel(f.dueAt) === "Today");
  const upcomingMeetings = meetingsAll
    .filter(
      (m) =>
        mine(m.ownerId) &&
        m.status === "Scheduled" &&
        new Date(m.scheduledAt).getTime() >= now - 86400000,
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 6);
  const recentOutreach = outreachAll.filter((o) => mine(o.ownerId)).slice(0, 6);
  const recentReplies = outreachAll
    .filter((o) => mine(o.ownerId) && o.repliedAt)
    .sort((a, b) => (b.repliedAt ?? "").localeCompare(a.repliedAt ?? ""))
    .slice(0, 5);
  const proposalsToChase = proposalsAll
    .filter((p) => mine(p.ownerId) && ["Sent", "Viewed", "Negotiation"].includes(p.status))
    .slice(0, 5);
  const recentDeals = dealsAll.filter((d) => mine(d.ownerId)).slice(0, 5);

  const company = (prospectId: string) =>
    getProspect(prospects, prospectId)?.company ?? "Unknown company";

  if (!bundle || !me || !todayMetrics || !rangeMetrics) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "my" ? `Welcome back, ${me.name.split(" ")[0]}` : "Team performance"}
        description={
          mode === "my"
            ? "Your outreach targets, follow-ups and pipeline for the selected period."
            : "Combined outreach, pipeline and revenue across the whole outreach team."
        }
        actions={
          <Tabs value={mode} onValueChange={(v) => setMode(v as "my" | "team")}>
            <TabsList>
              <TabsTrigger value="my">My dashboard</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {overdue.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3">
          <AlertTriangle className="size-4 text-warning" />
          <p className="text-sm font-medium">
            {overdue.length} follow-up{overdue.length === 1 ? " is" : "s are"} overdue.
          </p>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/follow-ups">Review follow-ups</Link>
          </Button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">This week vs target</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {weeklyProgress.map((p) => (
            <TargetCard
              key={p.metric}
              label={TARGET_METRIC_LABELS[p.metric]}
              actual={p.actual}
              target={p.target}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {mode === "my" ? "My results" : "Team results"} · selected period
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Prospects" value={rangeMetrics.prospects} icon={Users} />
          <MetricCard
            label="Outreach"
            value={rangeMetrics.outreach}
            icon={Send}
            hint={`${todayMetrics.outreach} today`}
          />
          <MetricCard
            label="Replies"
            value={rangeMetrics.replies}
            icon={MessageSquare}
            hint={`${rangeMetrics.replyRate}% reply rate`}
            tone="info"
          />
          <MetricCard
            label="Meetings"
            value={rangeMetrics.meetings}
            icon={CalendarDays}
            hint={`${rangeMetrics.discoveryCalls} discovery calls`}
          />
          <MetricCard
            label="Proposals"
            value={rangeMetrics.proposals}
            icon={FileText}
            hint={`${rangeMetrics.negotiations} in negotiation`}
          />
          <MetricCard
            label="Closed deals"
            value={rangeMetrics.closed}
            icon={Trophy}
            tone="success"
            hint={`${rangeMetrics.closeRate}% close rate`}
          />
          <MetricCard
            label="Pipeline value"
            value={formatCurrency(rangeMetrics.pipelineValue)}
            icon={Wallet}
          />
          <MetricCard
            label="Closed revenue"
            value={formatCurrency(rangeMetrics.revenue)}
            icon={Wallet}
            tone="success"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/70">
            <CardTitle>
              {mode === "my" ? "My outbound sales funnel" : "Team outbound sales funnel"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">From qualification · selected period</p>
          </CardHeader>
          <CardContent className="pt-6">
            <FunnelView stages={funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueToday.length === 0 ? (
              <EmptyState title="No follow-ups today." description="Enjoy the clear runway." />
            ) : (
              dueToday.slice(0, 6).map((f) => (
                <Link
                  key={f.id}
                  to="/prospects/$prospectId"
                  params={{ prospectId: f.prospectId }}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{company(f.prospectId)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(f.dueAt)}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingMeetings.length === 0 ? (
              <EmptyState title="No meetings scheduled." />
            ) : (
              upcomingMeetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{company(m.prospectId)}</p>
                    <p className="text-xs text-muted-foreground">{m.type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(m.scheduledAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOutreach.length === 0 ? (
              <EmptyState title="No outreach records yet." />
            ) : (
              recentOutreach.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{company(o.prospectId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {nameOf(bundle.outreachTypes, o.outreachTypeId)} · {formatDate(o.occurredAt)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent replies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentReplies.length === 0 ? (
              <EmptyState title="No replies recorded in this view." />
            ) : (
              recentReplies.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{company(o.prospectId)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(o.repliedAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposals needing follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proposalsToChase.length === 0 ? (
              <EmptyState title="No proposals found." />
            ) : (
              proposalsToChase.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{company(p.prospectId)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently closed deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDeals.length === 0 ? (
              <EmptyState title="No closed deals yet." icon={Trophy} />
            ) : (
              recentDeals.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{company(d.prospectId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {nameOf(bundle.serviceTypes, d.serviceTypeId)} · {formatDate(d.closedAt)}
                    </p>
                  </div>
                  <span className="numeric font-semibold text-success">
                    {formatCurrency(d.value)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
