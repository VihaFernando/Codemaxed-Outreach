import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import { nameOf } from "./referenceData";
import type { ID, Opportunity, OutreachStatus, ServiceType } from "./types";
import type { OpportunityRow } from "@/lib/supabase/types";

function mapOpportunity(r: OpportunityRow): Opportunity {
  return {
    id: r["id"],
    prospectId: r["prospect_id"],
    serviceTypeId: r["service_type_id"],
    ownerId: r["owner_id"],
    status: r["status"],
    dealValue: Number(r["deal_value"]),
    createdAt: r["created_at"],
  };
}

async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase.from("opportunities").select("*");
  if (error) throw error;
  return data.map(mapOpportunity);
}

export function useOpportunities() {
  return useQuery({ queryKey: qk.opportunities(), queryFn: fetchOpportunities });
}

export const getOpportunities = (opportunities: Opportunity[], prospectId?: ID) =>
  opportunities.filter((o) => !prospectId || o.prospectId === prospectId);
export const getOpportunity = (opportunities: Opportunity[], id?: ID | null) =>
  opportunities.find((o) => o.id === id);

export const STATUS_RANK: Record<OutreachStatus, number> = {
  Draft: 0,
  Sent: 1,
  "No Response": 1,
  "Follow-up Required": 1,
  Replied: 2,
  Qualified: 3,
  "Meeting Booked": 4,
  "Discovery Call": 4,
  "Proposal Sent": 5,
  Negotiation: 6,
  Closed: 7,
  "Not Interested": 0,
  Lost: 0,
};

/** The most advanced live status across a company's service opportunities. */
export function prospectStatus(opportunities: Opportunity[], prospectId: ID): OutreachStatus {
  const ops = getOpportunities(opportunities, prospectId);
  if (!ops.length) return "Draft";
  return ops.reduce((best, o) => (STATUS_RANK[o.status] > STATUS_RANK[best.status] ? o : best))
    .status;
}

export function prospectValue(opportunities: Opportunity[], prospectId: ID) {
  return getOpportunities(opportunities, prospectId).reduce((sum, o) => sum + o.dealValue, 0);
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      prospectId: ID;
      serviceTypeId: ID;
      ownerId: ID;
      dealValue?: number;
      status?: OutreachStatus;
      serviceTypes: ServiceType[];
    }) => {
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          prospect_id: input.prospectId,
          service_type_id: input.serviceTypeId,
          owner_id: input.ownerId,
          status: input.status ?? "Draft",
          deal_value: input.dealValue ?? 0,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: data.id,
        user_id: input.ownerId,
        type: "note_added",
        description: `New service opportunity added: ${nameOf(input.serviceTypes, input.serviceTypeId)}`,
      });

      return data.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: ID;
      patch: Partial<{ status: OutreachStatus; dealValue: number; ownerId: ID; serviceTypeId: ID }>;
    }) => {
      const dbPatch: Partial<OpportunityRow> = {};
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.dealValue !== undefined) dbPatch.deal_value = patch.dealValue;
      if (patch.ownerId !== undefined) dbPatch.owner_id = patch.ownerId;
      if (patch.serviceTypeId !== undefined) dbPatch.service_type_id = patch.serviceTypeId;
      const { error } = await supabase.from("opportunities").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.opportunities() }),
  });
}
