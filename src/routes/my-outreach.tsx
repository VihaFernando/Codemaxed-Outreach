import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { MetricCard } from "@/components/app/MetricCard";
import { OutreachTable } from "@/components/app/OutreachTable";
import { OutreachDialog } from "@/components/app/OutreachDialog";
import { useAnalyticsBundle, getMetrics, filterOutreach } from "@/lib/data/analytics";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { buildRange, type RangeKey } from "@/lib/data/dates";

export const Route = createFileRoute("/my-outreach")({
  head: () => ({
    meta: [
      { title: "My Outreach — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Your personal outreach activity, replies, meetings and conversion rates.",
      },
      { property: "og:title", content: "My Outreach — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Your personal outreach activity, replies, meetings and conversion rates.",
      },
    ],
  }),
  component: MyOutreach,
});

const TABS: Array<{ key: RangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "all_time", label: "All" },
];

function MyOutreach() {
  const { data: bundle } = useAnalyticsBundle();
  const { data: me } = useCurrentUser();
  const [tab, setTab] = useState<RangeKey>("today");
  const [open, setOpen] = useState(false);

  const range = useMemo(() => buildRange(tab), [tab]);

  const filters = useMemo(() => ({ userIds: me ? [me.id] : [] }), [me]);
  const metrics = useMemo(
    () => (bundle ? getMetrics(bundle, range, filters) : undefined),
    [bundle, range, filters],
  );
  const records = useMemo(
    () =>
      bundle
        ? filterOutreach(bundle, range, filters).sort((a, b) =>
            b.occurredAt.localeCompare(a.occurredAt),
          )
        : [],
    [bundle, range, filters],
  );

  if (!bundle || !me || !metrics) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My outreach"
        description={`Activity owned by ${me.name}.`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Send className="size-4" /> Add Outreach
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as RangeKey)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Outreach" value={metrics.outreach} />
        <MetricCard
          label="Replies"
          value={metrics.replies}
          hint={`${metrics.replyRate}% reply rate`}
          tone="info"
        />
        <MetricCard
          label="Meetings"
          value={metrics.meetings}
          hint={`${metrics.meetingRate}% meeting rate`}
        />
        <MetricCard
          label="Proposals"
          value={metrics.proposals}
          hint={`${metrics.proposalRate}% proposal rate`}
        />
        <MetricCard
          label="Closed"
          value={metrics.closed}
          hint={`${metrics.closeRate}% close rate`}
          tone="success"
        />
      </div>

      <Card>
        <CardContent className="p-0 sm:p-2">
          <OutreachTable records={records} showOwner={false} />
        </CardContent>
      </Card>

      <OutreachDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
