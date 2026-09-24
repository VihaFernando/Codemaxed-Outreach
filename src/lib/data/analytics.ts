import { buildRange, inRange, pct, type DateRange } from "./dates";
import { qk } from "./queries";
import { getSalesUsers } from "./referenceData";
import { STATUS_RANK } from "./opportunities";
import { tierValue } from "./targets";
import { TARGET_METRICS } from "./types";
import type {
  ID,
  Meeting,
  Opportunity,
  Outreach,
  OutreachStatus,
  OutreachTypeTarget,
  Prospect,
  Proposal,
  ServiceType,
  Target,
  TargetMetric,
  TargetTier,
  User,
} from "./types";

/* Bundle hook: fetches every table analytics needs, in parallel. */
export interface AnalyticsBundle {
  prospects: Prospect[];
  opportunities: Opportunity[];
  outreach: Outreach[];
  meetings: Meeting[];
  proposals: Proposal[];
  deals: import("./types").Deal[];
  serviceTypes: ServiceType[];
  outreachTypes: import("./types").OutreachType[];
  users: User[];
  targets: Target[];
  outreachTypeTargets: OutreachTypeTarget[];
}

import { useProspects } from "./prospects";
import { useOpportunities } from "./opportunities";
import { useOutreach as useOutreachList } from "./outreach";
import { useMeetings } from "./meetings";
import { useProposals } from "./proposals";
import { useDeals } from "./deals";
import { useOutreachTypes, useServiceTypes, useProfiles } from "./referenceData";
import { useTargets, useOutreachTypeTargets } from "./targets";

export function useAnalyticsBundle() {
  const prospects = useProspects();
  const opportunities = useOpportunities();
  const outreach = useOutreachList();
  const meetings = useMeetings();
  const proposals = useProposals();
  const deals = useDeals();
  const serviceTypes = useServiceTypes();
  const outreachTypes = useOutreachTypes();
  const users = useProfiles();
  const targets = useTargets();
  const outreachTypeTargets = useOutreachTypeTargets();

  const queries = [
    prospects,
    opportunities,
    outreach,
    meetings,
    proposals,
    deals,
    serviceTypes,
    outreachTypes,
    users,
    targets,
    outreachTypeTargets,
  ];
  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error;

  const data: AnalyticsBundle | undefined = isLoading
    ? undefined
    : {
        prospects: prospects.data ?? [],
        opportunities: opportunities.data ?? [],
        outreach: outreach.data ?? [],
        meetings: meetings.data ?? [],
        proposals: proposals.data ?? [],
        deals: deals.data ?? [],
        serviceTypes: serviceTypes.data ?? [],
        outreachTypes: outreachTypes.data ?? [],
        users: users.data ?? [],
        targets: targets.data ?? [],
        outreachTypeTargets: outreachTypeTargets.data ?? [],
      };

  return { data, isLoading, error };
}

/* ------------------------------------------------------------------ */
/* Pure aggregation functions, ported from services.ts almost verbatim */
/* ------------------------------------------------------------------ */

export interface MetricFilters {
  userIds?: ID[];
  outreachTypeId?: ID | "all";
  serviceTypeId?: ID | "all";
  status?: OutreachStatus | "all";
  industry?: string | "all";
  leadSourceId?: ID | "all";
}

const matchUser = (f: MetricFilters, id: ID) => !f.userIds?.length || f.userIds.includes(id);
const matchRef = (value: string | undefined, id?: string | "all") =>
  !id || id === "all" || value === id;

export function filterOutreach(bundle: AnalyticsBundle, range: DateRange, f: MetricFilters = {}) {
  return bundle.outreach.filter((o) => {
    const p = bundle.prospects.find((x) => x.id === o.prospectId);
    return (
      inRange(o.occurredAt, range) &&
      matchUser(f, o.ownerId) &&
      matchRef(o.outreachTypeId, f.outreachTypeId) &&
      matchRef(o.serviceTypeId, f.serviceTypeId) &&
      matchRef(o.status, f.status) &&
      matchRef(p?.industry, f.industry) &&
      matchRef(p?.leadSourceId, f.leadSourceId)
    );
  });
}

export interface CoreMetrics {
  outreach: number;
  replies: number;
  meetings: number;
  discoveryCalls: number;
  proposals: number;
  negotiations: number;
  closed: number;
  revenue: number;
  pipelineValue: number;
  prospects: number;
  replyRate: number;
  meetingRate: number;
  proposalRate: number;
  closeRate: number;
  overallCloseRate: number;
}

export function getMetrics(
  bundle: AnalyticsBundle,
  range: DateRange,
  f: MetricFilters = {},
): CoreMetrics {
  const outreach = filterOutreach(bundle, range, f);
  const replies = bundle.outreach.filter(
    (o) =>
      inRange(o.repliedAt, range) &&
      matchUser(f, o.ownerId) &&
      matchRef(o.outreachTypeId, f.outreachTypeId) &&
      matchRef(o.serviceTypeId, f.serviceTypeId),
  ).length;

  const meetingRecords = bundle.meetings.filter(
    (m) =>
      inRange(m.scheduledAt, range) &&
      matchUser(f, m.ownerId) &&
      matchRef(
        bundle.opportunities.find((o) => o.id === m.opportunityId)?.serviceTypeId,
        f.serviceTypeId,
      ) &&
      m.status !== "Cancelled",
  );
  const discoveryCalls = meetingRecords.filter((m) => m.type === "Discovery Call").length;

  const proposals = bundle.proposals.filter(
    (p) =>
      inRange(p.sentAt, range) &&
      matchUser(f, p.ownerId) &&
      matchRef(p.serviceTypeId, f.serviceTypeId),
  );
  const deals = bundle.deals.filter(
    (d) =>
      inRange(d.closedAt, range) &&
      matchUser(f, d.ownerId) &&
      matchRef(d.serviceTypeId, f.serviceTypeId),
  );
  const negotiations = bundle.opportunities.filter(
    (o) =>
      o.status === "Negotiation" &&
      matchUser(f, o.ownerId) &&
      matchRef(o.serviceTypeId, f.serviceTypeId),
  ).length;

  const openOpps = bundle.opportunities.filter(
    (o) =>
      matchUser(f, o.ownerId) &&
      matchRef(o.serviceTypeId, f.serviceTypeId) &&
      !["Closed", "Lost", "Not Interested"].includes(o.status),
  );

  const revenue = deals.reduce((s, d) => s + d.value, 0);
  const prospects = bundle.prospects.filter(
    (p) =>
      matchUser(f, p.ownerId) &&
      matchRef(p.industry, f.industry) &&
      matchRef(p.leadSourceId, f.leadSourceId),
  ).length;

  const meetings = meetingRecords.length;
  return {
    outreach: outreach.length,
    replies,
    meetings,
    discoveryCalls,
    proposals: proposals.length,
    negotiations,
    closed: deals.length,
    revenue,
    pipelineValue: openOpps.reduce((s, o) => s + o.dealValue, 0),
    prospects,
    replyRate: pct(replies, outreach.length),
    meetingRate: pct(meetings, replies),
    proposalRate: pct(proposals.length, meetings),
    closeRate: pct(deals.length, proposals.length),
    overallCloseRate: pct(deals.length, outreach.length),
  };
}

export interface FunnelStage {
  label: string;
  count: number;
  ofTargeted: number;
  conversionFromPrevious: number;
}

export function getFunnel(
  bundle: AnalyticsBundle,
  range: DateRange,
  f: MetricFilters = {},
): FunnelStage[] {
  const opps = bundle.opportunities.filter(
    (o) => matchUser(f, o.ownerId) && matchRef(o.serviceTypeId, f.serviceTypeId),
  );
  const outreachInRange = filterOutreach(bundle, range, f);
  const oppIdsWithOutreach = new Set(outreachInRange.map((o) => o.opportunityId));

  const relevant = opps.filter((o) => oppIdsWithOutreach.has(o.id) || range.key === "all_time");
  const scope = relevant.length ? relevant : opps.filter((o) => oppIdsWithOutreach.has(o.id));

  const usesDiscovery =
    f.serviceTypeId && f.serviceTypeId !== "all"
      ? bundle.serviceTypes.find((s) => s.id === f.serviceTypeId)?.usesDiscoveryCall
      : undefined;
  const midLabel =
    usesDiscovery === true
      ? "Discovery Call"
      : usesDiscovery === false
        ? "Meeting"
        : "Meeting / Discovery Call";

  const reached = (min: number) =>
    scope.filter((o) => STATUS_RANK[o.status] >= min && STATUS_RANK[o.status] > 0).length;

  const targeted = scope.length;
  const contacted = scope.filter((o) =>
    bundle.outreach.some((x) => x.opportunityId === o.id),
  ).length;
  const counts: Array<[string, number]> = [
    ["Targeted Prospects", targeted],
    ["Contacted", contacted],
    ["Replied", reached(2)],
    [midLabel, reached(4)],
    ["Proposal", reached(5)],
    ["Negotiation", reached(6)],
    ["Closed", reached(7)],
  ];

  return counts.map(([label, count], i) => ({
    label,
    count,
    ofTargeted: pct(count, targeted),
    conversionFromPrevious: i === 0 ? 100 : pct(count, counts[i - 1]![1]),
  }));
}

export interface TeamRow {
  user: User;
  outreach: number;
  replies: number;
  replyRate: number;
  meetings: number;
  meetingRate: number;
  proposals: number;
  closed: number;
  closeRate: number;
  pipelineValue: number;
  revenue: number;
}

export function getTeamPerformance(
  bundle: AnalyticsBundle,
  range: DateRange,
  f: MetricFilters = {},
): TeamRow[] {
  return getSalesUsers(bundle.users).map((user) => {
    const m = getMetrics(bundle, range, { ...f, userIds: [user.id] });
    return {
      user,
      outreach: m.outreach,
      replies: m.replies,
      replyRate: m.replyRate,
      meetings: m.meetings,
      meetingRate: m.meetingRate,
      proposals: m.proposals,
      closed: m.closed,
      closeRate: m.closeRate,
      pipelineValue: m.pipelineValue,
      revenue: m.revenue,
    };
  });
}

export function groupCount<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  items.forEach((i) => {
    const k = key(i);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function groupSum<T>(items: T[], key: (item: T) => string, amount: (item: T) => number) {
  const map = new Map<string, number>();
  items.forEach((i) => {
    const k = key(i);
    map.set(k, (map.get(k) ?? 0) + amount(i));
  });
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getTrend(bundle: AnalyticsBundle, range: DateRange, f: MetricFilters = {}) {
  const outreach = filterOutreach(bundle, range, f);
  const replies = bundle.outreach.filter(
    (o) => inRange(o.repliedAt, range) && matchUser(f, o.ownerId),
  );
  const buckets = new Map<string, { name: string; outreach: number; replies: number }>();
  const key = (iso: string) => iso.slice(0, 10);
  const ensure = (k: string) =>
    buckets.get(k) ?? buckets.set(k, { name: k.slice(5), outreach: 0, replies: 0 }).get(k)!;
  outreach.forEach((o) => (ensure(key(o.occurredAt)).outreach += 1));
  replies.forEach((o) => (ensure(key(o.repliedAt!)).replies += 1));
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
    .slice(-30);
}

export interface TargetProgress {
  metric: TargetMetric;
  label: string;
  target: number;
  actual: number;
  remaining: number;
  progress: number;
}

const METRIC_ACTUAL: Record<TargetMetric, (m: CoreMetrics) => number> = {
  outreach: (m) => m.outreach,
  replies: (m) => m.replies,
  meetings: (m) => m.meetings,
  discoveryCalls: (m) => m.discoveryCalls,
  proposals: (m) => m.proposals,
  closed: (m) => m.closed,
};

/**
 * Sum of every active channel's target for a tier, across the given users.
 * When `serviceTypeId` is omitted (or "all"), sums across every service too —
 * used for the dashboard's combined rollup.
 */
export function outreachTargetTotal(
  bundle: AnalyticsBundle,
  tier: TargetTier,
  userIds: ID[],
  serviceTypeId?: ID | "all",
): number {
  return bundle.outreachTypes
    .filter((t) => t.active)
    .reduce((sum, type) => {
      const perUser = userIds.reduce((s, userId) => {
        const matches = bundle.outreachTypeTargets.filter(
          (x) =>
            x.userId === userId &&
            x.outreachTypeId === type.id &&
            (!serviceTypeId || serviceTypeId === "all" || x.serviceTypeId === serviceTypeId),
        );
        return s + matches.reduce((sub, x) => sub + tierValue(x, tier), 0);
      }, 0);
      return sum + perUser;
    }, 0);
}

/**
 * All targets are weekly; progress is always measured against the current
 * week. The "outreach" metric's target is always derived as the sum of the
 * per-channel targets, never read from `targets` directly, so it never
 * drifts out of sync with the channel breakdown.
 */
export function getTargetProgress(
  bundle: AnalyticsBundle,
  tier: TargetTier,
  userIds: ID[],
  serviceTypeId?: ID | "all",
): TargetProgress[] {
  const range = buildRange("this_week");
  const metrics = getMetrics(
    bundle,
    range,
    serviceTypeId ? { userIds, serviceTypeId } : { userIds },
  );
  const services =
    serviceTypeId && serviceTypeId !== "all"
      ? [serviceTypeId]
      : bundle.serviceTypes.filter((s) => s.active).map((s) => s.id);
  const outreachCap = outreachTargetTotal(bundle, tier, userIds, serviceTypeId);
  return TARGET_METRICS.map((metric) => {
    const target =
      metric === "outreach"
        ? outreachCap
        : services.reduce((serviceSum, svcId) => {
            const cap = outreachTargetTotal(bundle, tier, userIds, svcId);
            const raw = userIds.reduce((sum, userId) => {
              const t = bundle.targets.find(
                (x) => x.userId === userId && x.metric === metric && x.serviceTypeId === svcId,
              );
              return sum + tierValue(t, tier);
            }, 0);
            return serviceSum + Math.min(raw, cap);
          }, 0);
    const actual = METRIC_ACTUAL[metric](metrics);
    return {
      metric,
      label: metric,
      target,
      actual,
      remaining: Math.max(0, target - actual),
      progress: pct(actual, target),
    };
  });
}

export interface OutreachTypeTargetProgress {
  outreachTypeId: ID;
  label: string;
  target: number;
  actual: number;
  remaining: number;
  progress: number;
}

/**
 * Per-channel weekly outreach volume vs. target, for the given tier. When
 * `serviceTypeId` is omitted (or "all"), sums targets and actuals across
 * every service.
 */
export function getOutreachTypeTargetProgress(
  bundle: AnalyticsBundle,
  tier: TargetTier,
  userIds: ID[],
  serviceTypeId?: ID | "all",
): OutreachTypeTargetProgress[] {
  const range = buildRange("this_week");
  return bundle.outreachTypes
    .filter((t) => t.active)
    .map((type) => {
      const target = userIds.reduce((sum, userId) => {
        const matches = bundle.outreachTypeTargets.filter(
          (x) =>
            x.userId === userId &&
            x.outreachTypeId === type.id &&
            (!serviceTypeId || serviceTypeId === "all" || x.serviceTypeId === serviceTypeId),
        );
        return sum + matches.reduce((s, x) => s + tierValue(x, tier), 0);
      }, 0);
      const actual = bundle.outreach.filter(
        (o) =>
          o.outreachTypeId === type.id &&
          inRange(o.occurredAt, range) &&
          (!userIds.length || userIds.includes(o.ownerId)) &&
          (!serviceTypeId || serviceTypeId === "all" || o.serviceTypeId === serviceTypeId),
      ).length;
      return {
        outreachTypeId: type.id,
        label: type.name,
        target,
        actual,
        remaining: Math.max(0, target - actual),
        progress: pct(actual, target),
      };
    });
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  id: string;
  category: "Prospect" | "Contact" | "Outreach" | "Meeting" | "Proposal";
  title: string;
  subtitle: string;
  prospectId: ID;
}

export function globalSearch(
  bundle: AnalyticsBundle,
  query: string,
  nameOf: (list: Array<{ id: ID; name: string }>, id?: ID | null, fallback?: string) => string,
): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const results: SearchResult[] = [];
  const hit = (...values: Array<string | undefined>) =>
    values.some((v) => (v ?? "").toLowerCase().includes(q));

  bundle.prospects.forEach((p) => {
    if (hit(p.company, p.website, p.linkedinUrl, p.industry, p.location)) {
      results.push({
        id: p.id,
        category: "Prospect",
        title: p.company,
        subtitle: `${p.industry || "—"} · ${p.location || "—"}`,
        prospectId: p.id,
      });
    }
    if (hit(p.contactPerson, p.email, p.phone)) {
      results.push({
        id: `${p.id}_c`,
        category: "Contact",
        title: p.contactPerson,
        subtitle: `${p.company} · ${p.email || p.phone}`,
        prospectId: p.id,
      });
    }
  });

  bundle.outreach.forEach((o) => {
    const p = bundle.prospects.find((x) => x.id === o.prospectId);
    if (p && hit(o.message)) {
      results.push({
        id: o.id,
        category: "Outreach",
        title: `${nameOf(bundle.outreachTypes, o.outreachTypeId)} — ${p.company}`,
        subtitle: o.message.slice(0, 70),
        prospectId: p.id,
      });
    }
  });

  bundle.meetings.forEach((m) => {
    const p = bundle.prospects.find((x) => x.id === m.prospectId);
    if (p && hit(m.notes, p.company, m.type)) {
      results.push({
        id: m.id,
        category: "Meeting",
        title: `${m.type} — ${p.company}`,
        subtitle: m.notes.slice(0, 70),
        prospectId: p.id,
      });
    }
  });

  bundle.proposals.forEach((pr) => {
    const p = bundle.prospects.find((x) => x.id === pr.prospectId);
    if (p && hit(p.company, pr.notes)) {
      results.push({
        id: pr.id,
        category: "Proposal",
        title: `Proposal — ${p.company}`,
        subtitle: `${pr.status} · ${pr.amount.toLocaleString()}`,
        prospectId: p.id,
      });
    }
  });

  return results.slice(0, 25);
}
