import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { ID, Proposal } from "./types";
import type { ProposalRow } from "@/lib/supabase/types";

function mapProposal(r: ProposalRow): Proposal {
  return {
    id: r["id"],
    prospectId: r["prospect_id"],
    opportunityId: r["opportunity_id"],
    serviceTypeId: r["service_type_id"],
    ownerId: r["owner_id"],
    sentAt: r["sent_at"],
    amount: Number(r["amount"]),
    status: r["status"],
    followUpAt: r["follow_up_at"],
    notes: r["notes"],
  };
}

async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return data.map(mapProposal);
}

export function useProposals() {
  return useQuery({ queryKey: qk.proposals(), queryFn: fetchProposals });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Proposal, "id">) => {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          prospect_id: input.prospectId,
          opportunity_id: input.opportunityId,
          service_type_id: input.serviceTypeId,
          owner_id: input.ownerId,
          sent_at: input.sentAt,
          amount: input.amount,
          status: input.status,
          follow_up_at: input.followUpAt ?? null,
          notes: input.notes,
        })
        .select()
        .single();
      if (error) throw error;

      const { data: opp } = await supabase
        .from("opportunities")
        .select("status")
        .eq("id", input.opportunityId)
        .single();
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
      if (opp && STATUS_RANK[opp["status"]]! < 5) {
        const oppPatch: Partial<import("@/lib/supabase/types").OpportunityRow> = {
          status: "Proposal Sent",
        };
        if (input.amount) oppPatch.deal_value = input.amount;
        await supabase.from("opportunities").update(oppPatch).eq("id", input.opportunityId);
      }

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: input.opportunityId,
        user_id: input.ownerId,
        type: "proposal_sent",
        description: `Proposal sent — ${input.amount.toLocaleString()}`,
        occurred_at: input.sentAt,
      });

      return data.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.proposals() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposal, patch }: { proposal: Proposal; patch: Partial<Proposal> }) => {
      const dbPatch: Partial<ProposalRow> = {};
      if (patch.amount !== undefined) dbPatch.amount = patch.amount;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.followUpAt !== undefined) dbPatch.follow_up_at = patch.followUpAt;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      const { error } = await supabase.from("proposals").update(dbPatch).eq("id", proposal.id);
      if (error) throw error;

      const status = patch.status;
      if (status === "Negotiation") {
        await supabase
          .from("opportunities")
          .update({ status: "Negotiation" })
          .eq("id", proposal.opportunityId);
        await supabase.from("activities").insert({
          prospect_id: proposal.prospectId,
          opportunity_id: proposal.opportunityId,
          user_id: proposal.ownerId,
          type: "negotiation_started",
          description: "Proposal moved to negotiation",
        });
      }

      if (status === "Accepted") {
        const { data: existingDeal } = await supabase
          .from("deals")
          .select("id")
          .eq("opportunity_id", proposal.opportunityId)
          .maybeSingle();
        if (!existingDeal) {
          const { data: lastOutreach } = await supabase
            .from("outreach")
            .select("outreach_type_id")
            .eq("opportunity_id", proposal.opportunityId)
            .order("occurred_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          let outreachTypeId = lastOutreach?.outreach_type_id;
          if (!outreachTypeId) {
            const { data: fallbackType, error: fallbackError } = await supabase
              .from("outreach_types")
              .select("id")
              .limit(1)
              .single();
            if (fallbackError) throw fallbackError;
            outreachTypeId = fallbackType.id;
          }

          await supabase.from("deals").insert({
            prospect_id: proposal.prospectId,
            opportunity_id: proposal.opportunityId,
            service_type_id: proposal.serviceTypeId,
            outreach_type_id: outreachTypeId,
            owner_id: proposal.ownerId,
            closed_at: new Date().toISOString(),
            value: proposal.amount,
            notes: "Closed from accepted proposal.",
          });

          await supabase
            .from("opportunities")
            .update({ status: "Closed" })
            .eq("id", proposal.opportunityId);

          await supabase.from("activities").insert({
            prospect_id: proposal.prospectId,
            opportunity_id: proposal.opportunityId,
            user_id: proposal.ownerId,
            type: "deal_closed",
            description: `Deal closed — ${proposal.amount.toLocaleString()}`,
          });
        }
      }

      if (status === "Rejected") {
        await supabase
          .from("opportunities")
          .update({ status: "Lost" })
          .eq("id", proposal.opportunityId);
        await supabase.from("activities").insert({
          prospect_id: proposal.prospectId,
          opportunity_id: proposal.opportunityId,
          user_id: proposal.ownerId,
          type: "deal_lost",
          description: "Proposal rejected",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.proposals() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.deals() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
      queryClient.invalidateQueries({ queryKey: qk.outreach() });
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.proposals() }),
  });
}
