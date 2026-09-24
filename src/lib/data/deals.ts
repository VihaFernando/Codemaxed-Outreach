import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { Deal, ID } from "./types";

function mapDeal(r: {
  id: string;
  prospect_id: string;
  opportunity_id: string;
  service_type_id: string;
  outreach_type_id: string;
  owner_id: string;
  closed_at: string;
  value: number;
  notes: string;
}): Deal {
  return {
    id: r.id,
    prospectId: r.prospect_id,
    opportunityId: r.opportunity_id,
    serviceTypeId: r.service_type_id,
    outreachTypeId: r.outreach_type_id,
    ownerId: r.owner_id,
    closedAt: r.closed_at,
    value: Number(r.value),
    notes: r.notes,
  };
}

async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("closed_at", { ascending: false });
  if (error) throw error;
  return data.map(mapDeal);
}

export function useDeals() {
  return useQuery({ queryKey: qk.deals(), queryFn: fetchDeals });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Deal, "id">) => {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          prospect_id: input.prospectId,
          opportunity_id: input.opportunityId,
          service_type_id: input.serviceTypeId,
          outreach_type_id: input.outreachTypeId,
          owner_id: input.ownerId,
          closed_at: input.closedAt,
          value: input.value,
          notes: input.notes,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("opportunities")
        .update({ status: "Closed", deal_value: input.value })
        .eq("id", input.opportunityId);

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: input.opportunityId,
        user_id: input.ownerId,
        type: "deal_closed",
        description: `Deal closed — ${input.value.toLocaleString()}`,
        occurred_at: input.closedAt,
      });

      return data.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.deals() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.deals() }),
  });
}
