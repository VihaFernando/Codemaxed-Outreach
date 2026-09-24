import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "./Field";
import { useProspects } from "@/lib/data/prospects";
import { useOpportunities, getOpportunities } from "@/lib/data/opportunities";
import { useServiceTypes, nameOf } from "@/lib/data/referenceData";

export function OpportunityPicker({
  prospectId,
  opportunityId,
  onProspectChange,
  onOpportunityChange,
  lockProspect,
}: {
  prospectId: string;
  opportunityId: string;
  onProspectChange: (id: string) => void;
  onOpportunityChange: (id: string) => void;
  lockProspect?: boolean;
}) {
  const { data: allProspects = [] } = useProspects();
  const { data: allOpportunities = [] } = useOpportunities();
  const { data: serviceTypes = [] } = useServiceTypes();
  const prospects = useMemo(
    () => allProspects.slice().sort((a, b) => a.company.localeCompare(b.company)),
    [allProspects],
  );
  const opportunities = prospectId ? getOpportunities(allOpportunities, prospectId) : [];

  return (
    <>
      {!lockProspect ? (
        <Field label="Company / prospect">
          <Select
            value={prospectId}
            onValueChange={(v) => {
              onProspectChange(v);
              const first = getOpportunities(allOpportunities, v)[0];
              onOpportunityChange(first?.id ?? "");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a prospect" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {prospects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <Field label="Service opportunity">
        <Select value={opportunityId} onValueChange={onOpportunityChange} disabled={!prospectId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a service opportunity" />
          </SelectTrigger>
          <SelectContent>
            {opportunities.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {nameOf(serviceTypes, o.serviceTypeId)} · {o.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
