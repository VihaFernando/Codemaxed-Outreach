import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { OutreachTable } from "@/components/app/OutreachTable";
import { OutreachDialog } from "@/components/app/OutreachDialog";
import { useAppUI } from "@/lib/ui-context";
import { useAnalyticsBundle, filterOutreach } from "@/lib/data/analytics";
import { getProspect } from "@/lib/data/prospects";
import { getSalesUsers, useLeadSources } from "@/lib/data/referenceData";
import { OUTREACH_STATUSES } from "@/lib/data/types";

export const Route = createFileRoute("/outreach")({
  head: () => ({
    meta: [
      { title: "All Outreach — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content: "Every outreach record across the team, with filters and quick status updates.",
      },
      { property: "og:title", content: "All Outreach — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content: "Every outreach record across the team, with filters and quick status updates.",
      },
    ],
  }),
  component: AllOutreach,
});

function AllOutreach() {
  const { data: bundle } = useAnalyticsBundle();
  const { data: leadSources = [] } = useLeadSources();
  const { range } = useAppUI();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [service, setService] = useState("all");
  const [status, setStatus] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [leadSource, setLeadSource] = useState("all");
  const [query, setQuery] = useState("");

  const industries = useMemo(
    () => Array.from(new Set((bundle?.prospects ?? []).map((p) => p.industry))).sort(),
    [bundle],
  );

  const records = useMemo(() => {
    if (!bundle) return [];
    const base = filterOutreach(bundle, range, {
      ...(owner !== "all" ? { userIds: [owner] } : {}),
      outreachTypeId: platform,
      serviceTypeId: service,
      status: status === "all" ? "all" : (status as (typeof OUTREACH_STATUSES)[number]),
      industry,
      leadSourceId: leadSource,
    });
    const q = query.toLowerCase().trim();
    const filtered = q
      ? base.filter((o) => {
          const p = getProspect(bundle.prospects, o.prospectId);
          return [p?.company, p?.contactPerson, p?.email, p?.phone, p?.website]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q));
        })
      : base;
    return filtered.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [bundle, range, owner, platform, service, status, industry, leadSource, query]);

  if (!bundle) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="All outreach"
        description={`${records.length} record${records.length === 1 ? "" : "s"} in the selected period.`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Send className="size-4" /> Add Outreach
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Search company, contact, email, phone, website…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="xl:col-span-2"
          />
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
          <FilterSelect
            value={industry}
            onChange={setIndustry}
            label="All industries"
            options={industries.map((i) => ({ value: i, label: i }))}
          />
          <FilterSelect
            value={leadSource}
            onChange={setLeadSource}
            label="All lead sources"
            options={leadSources.map((l) => ({ value: l.id, label: l.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 sm:p-2">
          <OutreachTable records={records} />
        </CardContent>
      </Card>

      <OutreachDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
