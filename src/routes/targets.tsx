import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { TargetCard } from "@/components/app/MetricCard";
import {
  useTargets,
  useOutreachTypeTargets,
  useUpsertTarget,
  useUpsertOutreachTypeTarget,
} from "@/lib/data/targets";
import {
  useAnalyticsBundle,
  getTargetProgress,
  getOutreachTypeTargetProgress,
  outreachTargetTotal,
} from "@/lib/data/analytics";
import { getSalesUsers } from "@/lib/data/referenceData";
import {
  TARGET_METRICS,
  TARGET_METRIC_LABELS,
  TARGET_TIERS,
  TARGET_TIER_LABELS,
  type TargetMetric,
  type TargetTier,
} from "@/lib/data/types";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Targets — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content:
          "Set weekly Minimum, Average and Stretch targets per outreach channel and per pipeline metric.",
      },
      { property: "og:title", content: "Targets — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content:
          "Set weekly Minimum, Average and Stretch targets per outreach channel and per pipeline metric.",
      },
    ],
  }),
  component: TargetsPage,
});

function TierInput({
  value,
  onSave,
  disabled,
  max,
}: {
  value: number;
  onSave: (next: number) => void;
  disabled?: boolean;
  /** When set, the value is clamped to this upper bound on blur. */
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  return (
    <Input
      className="h-8 w-20 numeric"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        let next = Number(draft) || 0;
        if (max !== undefined) next = Math.min(next, max);
        if (next !== value) onSave(next);
        if (next !== Number(draft)) setDraft(String(next));
      }}
      inputMode="numeric"
    />
  );
}

function OutreachTypeTargetRow({
  userId,
  outreachTypeId,
  name,
}: {
  userId: string;
  outreachTypeId: string;
  name: string;
}) {
  const { data: targets = [] } = useOutreachTypeTargets();
  const upsert = useUpsertOutreachTypeTarget();
  const target = targets.find((t) => t.userId === userId && t.outreachTypeId === outreachTypeId);

  function save(tier: TargetTier, next: number) {
    upsert.mutate(
      { userId, outreachTypeId, patch: { [tier]: next } },
      {
        onSuccess: () =>
          toast.success(`${name} ${TARGET_TIER_LABELS[tier].toLowerCase()} target updated`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to update target"),
      },
    );
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-medium">{name}</td>
      {TARGET_TIERS.map((tier) => (
        <td key={tier} className="px-3 py-2">
          <TierInput
            value={target?.[tier] ?? 0}
            disabled={upsert.isPending}
            onSave={(next) => save(tier, next)}
          />
        </td>
      ))}
    </tr>
  );
}

function MetricTargetRow({
  userId,
  metric,
  channelTotals,
}: {
  userId: string;
  metric: TargetMetric;
  channelTotals: Record<TargetTier, number>;
}) {
  const { data: targets = [] } = useTargets();
  const upsert = useUpsertTarget();
  const target = targets.find((t) => t.userId === userId && t.metric === metric);

  if (metric === "outreach") {
    // Outreach is derived from the sum of per-channel targets — read-only here.
    return (
      <tr className="border-b border-border last:border-0">
        <td className="px-3 py-2 font-medium">
          {TARGET_METRIC_LABELS[metric]}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(from channels)</span>
        </td>
        {TARGET_TIERS.map((tier) => (
          <td key={tier} className="px-3 py-2 numeric text-muted-foreground">
            {channelTotals[tier]}
          </td>
        ))}
      </tr>
    );
  }

  function save(tier: TargetTier, next: number) {
    const cap = channelTotals[tier];
    const clamped = Math.min(next, cap);
    upsert.mutate(
      { userId, metric, patch: { [tier]: clamped } },
      {
        onSuccess: () =>
          toast.success(
            `${TARGET_METRIC_LABELS[metric]} ${TARGET_TIER_LABELS[tier].toLowerCase()} target updated`,
          ),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to update target"),
      },
    );
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 font-medium">{TARGET_METRIC_LABELS[metric]}</td>
      {TARGET_TIERS.map((tier) => (
        <td key={tier} className="px-3 py-2">
          <TierInput
            value={target?.[tier] ?? 0}
            disabled={upsert.isPending}
            max={channelTotals[tier]}
            onSave={(next) => save(tier, next)}
          />
        </td>
      ))}
    </tr>
  );
}

function TargetsPage() {
  const { data: bundle } = useAnalyticsBundle();
  const users = getSalesUsers(bundle?.users ?? []);
  const [selectedUserId, setUserId] = useState("");
  const userId = selectedUserId || users[0]?.id || "";
  const [tier, setTier] = useState<TargetTier>("average");

  const metricProgress = bundle ? getTargetProgress(bundle, tier, userId ? [userId] : []) : [];
  const channelProgress = bundle
    ? getOutreachTypeTargetProgress(bundle, tier, userId ? [userId] : [])
    : [];
  const outreachTypes = (bundle?.outreachTypes ?? []).filter((t) => t.active);

  const channelTotals = TARGET_TIERS.reduce(
    (totals, t) => {
      totals[t] = bundle ? outreachTargetTotal(bundle, t, userId ? [userId] : []) : 0;
      return totals;
    },
    { minimum: 0, average: 0, stretch: 0 } as Record<TargetTier, number>,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets"
        description="Weekly Minimum, Average and Stretch targets per outreach channel and per pipeline metric."
      />

      <div className="flex flex-wrap items-center gap-2">
        {users.map((u) => (
          <Button
            key={u.id}
            size="sm"
            variant={u.id === userId ? "default" : "outline"}
            onClick={() => setUserId(u.id)}
          >
            {u.name}
          </Button>
        ))}
      </div>

      <Tabs value={tier} onValueChange={(v) => setTier(v as TargetTier)}>
        <TabsList>
          {TARGET_TIERS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {TARGET_TIER_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Weekly outreach targets — {TARGET_TIER_LABELS[tier].toLowerCase()}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <TargetCard
            label="Prospects contacted"
            actual={channelProgress.reduce((s, p) => s + p.actual, 0)}
            target={channelTotals[tier]}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>By channel</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Channel</th>
                    {TARGET_TIERS.map((t) => (
                      <th key={t} className="px-3 py-2 font-medium">
                        {TARGET_TIER_LABELS[t]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outreachTypes.map((t) => (
                    <OutreachTypeTargetRow
                      key={`${userId}-${t.id}`}
                      userId={userId}
                      outreachTypeId={t.id}
                      name={t.name}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Conversion targets — {TARGET_TIER_LABELS[tier].toLowerCase()}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricProgress.map((p) => (
            <TargetCard
              key={p.metric}
              label={TARGET_METRIC_LABELS[p.metric]}
              actual={p.actual}
              target={p.target}
            />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit conversion targets</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Metric</th>
                    {TARGET_TIERS.map((t) => (
                      <th key={t} className="px-3 py-2 font-medium">
                        {TARGET_TIER_LABELS[t]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TARGET_METRICS.map((m) => (
                    <MetricTargetRow
                      key={`${userId}-${m}`}
                      userId={userId}
                      metric={m}
                      channelTotals={channelTotals}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
