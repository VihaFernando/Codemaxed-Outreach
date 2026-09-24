import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { getSalesUsers, useUpdateTargetsSelectedServices } from "@/lib/data/referenceData";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
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
          "Set weekly Minimum, Average and Stretch targets per service, split across outreach channels and pipeline metrics.",
      },
      { property: "og:title", content: "Targets — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content:
          "Set weekly Minimum, Average and Stretch targets per service, split across outreach channels and pipeline metrics.",
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
  useEffect(() => setDraft(String(value)), [value]);
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
  serviceTypeId,
  outreachTypeId,
  name,
}: {
  userId: string;
  serviceTypeId: string;
  outreachTypeId: string;
  name: string;
}) {
  const { data: targets = [] } = useOutreachTypeTargets();
  const upsert = useUpsertOutreachTypeTarget();
  const target = targets.find(
    (t) =>
      t.userId === userId &&
      t.serviceTypeId === serviceTypeId &&
      t.outreachTypeId === outreachTypeId,
  );

  function save(tier: TargetTier, next: number) {
    upsert.mutate(
      { userId, serviceTypeId, outreachTypeId, patch: { [tier]: next } },
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
  serviceTypeId,
  metric,
  channelTotals,
}: {
  userId: string;
  serviceTypeId: string;
  metric: TargetMetric;
  channelTotals: Record<TargetTier, number>;
}) {
  const { data: targets = [] } = useTargets();
  const upsert = useUpsertTarget();
  const target = targets.find(
    (t) => t.userId === userId && t.serviceTypeId === serviceTypeId && t.metric === metric,
  );

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
      { userId, serviceTypeId, metric, patch: { [tier]: clamped } },
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

function ServiceTargetSection({
  userId,
  serviceTypeId,
  serviceName,
  bundle,
}: {
  userId: string;
  serviceTypeId: string;
  serviceName: string;
  bundle: NonNullable<ReturnType<typeof useAnalyticsBundle>["data"]>;
}) {
  const [tier, setTier] = useState<TargetTier>("average");

  const metricProgress = getTargetProgress(bundle, tier, userId ? [userId] : [], serviceTypeId);
  const channelProgress = getOutreachTypeTargetProgress(
    bundle,
    tier,
    userId ? [userId] : [],
    serviceTypeId,
  );
  const outreachTypes = bundle.outreachTypes.filter((t) => t.active);

  const channelTotals = TARGET_TIERS.reduce(
    (totals, t) => {
      totals[t] = outreachTargetTotal(bundle, t, userId ? [userId] : [], serviceTypeId);
      return totals;
    },
    { minimum: 0, average: 0, stretch: 0 } as Record<TargetTier, number>,
  );

  return (
    <AccordionItem value={serviceTypeId} className="rounded-lg border border-border px-4">
      <AccordionTrigger className="py-3 text-sm font-semibold">{serviceName}</AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <Tabs value={tier} onValueChange={(v) => setTier(v as TargetTier)}>
          <TabsList>
            {TARGET_TIERS.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TARGET_TIER_LABELS[t]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                By channel
              </h3>
              <span className="text-xs text-muted-foreground">
                {channelProgress.reduce((s, p) => s + p.actual, 0)} / {channelTotals[tier]}{" "}
                contacted
              </span>
            </div>
            <Card className="py-0">
              <CardContent className="p-0 sm:p-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Channel</th>
                        {TARGET_TIERS.map((t) => (
                          <th key={t} className="px-3 py-1.5 font-medium">
                            {TARGET_TIER_LABELS[t]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {outreachTypes.map((t) => (
                        <OutreachTypeTargetRow
                          key={`${userId}-${serviceTypeId}-${t.id}`}
                          userId={userId}
                          serviceTypeId={serviceTypeId}
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

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conversion targets
            </h3>
            <Card className="py-0">
              <CardContent className="p-0 sm:p-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Metric</th>
                        {TARGET_TIERS.map((t) => (
                          <th key={t} className="px-3 py-1.5 font-medium">
                            {TARGET_TIER_LABELS[t]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TARGET_METRICS.map((m) => (
                        <MetricTargetRow
                          key={`${userId}-${serviceTypeId}-${m}`}
                          userId={userId}
                          serviceTypeId={serviceTypeId}
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

        <div className="grid gap-3 sm:grid-cols-3">
          {metricProgress
            .filter((p) => p.metric !== "outreach")
            .map((p) => (
              <TargetCard
                key={p.metric}
                label={TARGET_METRIC_LABELS[p.metric]}
                actual={p.actual}
                target={p.target}
              />
            ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function TargetsPage() {
  const { data: bundle } = useAnalyticsBundle();
  const { data: me } = useCurrentUser();
  const updateSelectedServices = useUpdateTargetsSelectedServices();
  const users = getSalesUsers(bundle?.users ?? []);
  const services = (bundle?.serviceTypes ?? []).filter((s) => s.active);
  const [selectedUserId, setUserId] = useState("");
  const userId = selectedUserId || me?.id || users[0]?.id || "";

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[] | null>(null);
  if (selectedServiceIds === null && me) {
    setSelectedServiceIds(me.targetsSelectedServiceIds);
  }

  function toggleService(id: string) {
    const current = selectedServiceIds ?? [];
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    setSelectedServiceIds(next);
    if (me) updateSelectedServices.mutate({ id: me.id, serviceIds: next });
  }

  const activeServiceIds = (selectedServiceIds ?? []).filter((id) =>
    services.some((s) => s.id === id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets"
        description="Weekly Minimum, Average and Stretch targets per service, split across outreach channels."
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

      <div className="space-y-2">
        <span className="text-sm font-medium text-muted-foreground">
          Select the services to set targets for
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {services.map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={activeServiceIds.includes(s.id) ? "default" : "outline"}
              onClick={() => toggleService(s.id)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      </div>

      {!bundle ? null : activeServiceIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Select one or more services above to view and edit their targets.
        </p>
      ) : (
        <Accordion type="multiple" defaultValue={activeServiceIds} className="space-y-3">
          {activeServiceIds.map((serviceTypeId) => (
            <ServiceTargetSection
              key={`${userId}-${serviceTypeId}`}
              userId={userId}
              serviceTypeId={serviceTypeId}
              serviceName={services.find((s) => s.id === serviceTypeId)?.name ?? "—"}
              bundle={bundle}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}
