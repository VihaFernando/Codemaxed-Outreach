import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import { nameOf } from "./referenceData";
import type { ID, Outreach, OutreachStatus, OutreachType, ServiceType } from "./types";
import type { OutreachRow, OpportunityRow } from "@/lib/supabase/types";

function mapOutreach(r: OutreachRow): Outreach {
  return {
    id: r["id"],
    prospectId: r["prospect_id"],
    opportunityId: r["opportunity_id"],
    outreachTypeId: r["outreach_type_id"],
    serviceTypeId: r["service_type_id"],
    ownerId: r["owner_id"],
    occurredAt: r["occurred_at"],
    repliedAt: r["replied_at"],
    message: r["message"],
    status: r["status"],
    followUpAt: r["follow_up_at"],
  };
}

async function fetchOutreach(): Promise<Outreach[]> {
  const { data, error } = await supabase
    .from("outreach")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data.map(mapOutreach);
}

export function useOutreach() {
  return useQuery({ queryKey: qk.outreach(), queryFn: fetchOutreach });
}

export const getProspectOutreach = (outreach: Outreach[], prospectId: ID) =>
  outreach
    .filter((o) => o.prospectId === prospectId)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

export function lastOutreachAt(outreach: Outreach[], prospectId: ID) {
  return getProspectOutreach(outreach, prospectId)[0]?.occurredAt ?? null;
}

export interface OutreachInput {
  prospectId: ID;
  opportunityId?: ID;
  serviceTypeId: ID;
  outreachTypeId: ID;
  ownerId: ID;
  occurredAt: string;
  message?: string;
  followUpAt?: string | null;
  status?: OutreachStatus;
  dealValue?: number;
  outreachTypes: OutreachType[];
  serviceTypes: ServiceType[];
}

export function useCreateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OutreachInput) => {
      let opportunityId = input.opportunityId;

      if (!opportunityId) {
        const { data: existing } = await supabase
          .from("opportunities")
          .select("id")
          .eq("prospect_id", input.prospectId)
          .eq("service_type_id", input.serviceTypeId)
          .maybeSingle();

        if (existing) {
          opportunityId = existing.id;
        } else {
          const { data: created, error: createError } = await supabase
            .from("opportunities")
            .insert({
              prospect_id: input.prospectId,
              service_type_id: input.serviceTypeId,
              owner_id: input.ownerId,
              status: "Sent",
              deal_value: input.dealValue ?? 0,
            })
            .select()
            .single();
          if (createError) throw createError;
          opportunityId = created.id;
        }
      }

      const status = input.status ?? "Sent";
      const { data: record, error: outreachError } = await supabase
        .from("outreach")
        .insert({
          prospect_id: input.prospectId,
          opportunity_id: opportunityId,
          outreach_type_id: input.outreachTypeId,
          service_type_id: input.serviceTypeId,
          owner_id: input.ownerId,
          occurred_at: input.occurredAt,
          message: input.message ?? "",
          status,
          follow_up_at: input.followUpAt ?? null,
        })
        .select()
        .single();
      if (outreachError) throw outreachError;

      // Opportunity only moves forward - never regress an advanced stage.
      const { data: opp } = await supabase
        .from("opportunities")
        .select("status")
        .eq("id", opportunityId)
        .single();
      if (opp) {
        const STATUS_RANK: Record<string, number> = {
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
        const patch: Partial<OpportunityRow> = {};
        if (STATUS_RANK[status]! > STATUS_RANK[opp["status"]]!) patch.status = status;
        if (input.dealValue !== undefined) patch.deal_value = input.dealValue;
        if (Object.keys(patch).length) {
          await supabase.from("opportunities").update(patch).eq("id", opportunityId);
        }
      }

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: opportunityId,
        user_id: input.ownerId,
        type: "outreach_sent",
        description: `${nameOf(input.outreachTypes, input.outreachTypeId)} outreach sent regarding ${nameOf(input.serviceTypes, input.serviceTypeId)}`,
        occurred_at: input.occurredAt,
      });

      if (input.followUpAt) {
        await supabase.from("follow_ups").insert({
          prospect_id: input.prospectId,
          opportunity_id: opportunityId,
          owner_id: input.ownerId,
          due_at: input.followUpAt,
          notes: "Follow up on outreach.",
          status: "Pending",
        });
        await supabase.from("activities").insert({
          prospect_id: input.prospectId,
          opportunity_id: opportunityId,
          user_id: input.ownerId,
          type: "followup_scheduled",
          description: "Follow-up scheduled",
        });
      }

      return record.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.outreach() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
      queryClient.invalidateQueries({ queryKey: qk.followUps() });
    },
  });
}

export function useUpdateOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: ID; patch: Partial<Outreach> }) => {
      const dbPatch: Partial<OutreachRow> = {};
      if (patch.message !== undefined) dbPatch.message = patch.message;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.occurredAt !== undefined) dbPatch.occurred_at = patch.occurredAt;
      if (patch.followUpAt !== undefined) dbPatch.follow_up_at = patch.followUpAt;
      if (patch.repliedAt !== undefined) dbPatch.replied_at = patch.repliedAt;
      const { error } = await supabase.from("outreach").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.outreach() }),
  });
}

export function useDeleteOutreach() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("outreach").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.outreach() }),
  });
}

/**
 * Status changes are the spine of the app: they log activity, move the
 * opportunity forward and create the matching meeting / proposal / deal
 * record. Implemented server-side as a Postgres RPC (set_outreach_status) for
 * atomicity across the up-to-5 tables it can touch.
 */
export function useSetOutreachStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      actorId,
    }: {
      id: ID;
      status: OutreachStatus;
      actorId: ID;
    }) => {
      const { error } = await supabase.rpc("set_outreach_status", {
        p_outreach_id: id,
        p_status: status,
        p_actor_id: actorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.outreach() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
      queryClient.invalidateQueries({ queryKey: qk.meetings() });
      queryClient.invalidateQueries({ queryKey: qk.proposals() });
      queryClient.invalidateQueries({ queryKey: qk.deals() });
    },
  });
}
