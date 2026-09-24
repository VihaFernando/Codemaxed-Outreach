import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { FollowUp, ID } from "./types";
import type { FollowUpRow } from "@/lib/supabase/types";

function mapFollowUp(r: FollowUpRow): FollowUp {
  return {
    id: r["id"],
    prospectId: r["prospect_id"],
    opportunityId: r["opportunity_id"],
    ownerId: r["owner_id"],
    dueAt: r["due_at"],
    notes: r["notes"],
    status: r["status"],
    completedAt: r["completed_at"],
  };
}

async function fetchFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase.from("follow_ups").select("*").order("due_at");
  if (error) throw error;
  return data.map(mapFollowUp);
}

export function useFollowUps() {
  return useQuery({ queryKey: qk.followUps(), queryFn: fetchFollowUps });
}

export function nextFollowUpAt(followUps: FollowUp[], prospectId: ID) {
  return (
    followUps
      .filter((f) => f.prospectId === prospectId && f.status === "Pending")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]?.dueAt ?? null
  );
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      prospectId: ID;
      opportunityId: ID;
      ownerId: ID;
      dueAt: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from("follow_ups")
        .insert({
          prospect_id: input.prospectId,
          opportunity_id: input.opportunityId,
          owner_id: input.ownerId,
          due_at: input.dueAt,
          notes: input.notes,
          status: "Pending",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: input.opportunityId,
        user_id: input.ownerId,
        type: "followup_scheduled",
        description: "Follow-up scheduled",
      });

      return data.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.followUps() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: ID; patch: Partial<FollowUp> }) => {
      const dbPatch: Partial<FollowUpRow> = {};
      if (patch.dueAt !== undefined) dbPatch.due_at = patch.dueAt;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.completedAt !== undefined) dbPatch.completed_at = patch.completedAt;
      const { error } = await supabase.from("follow_ups").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.followUps() }),
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (followUp: FollowUp) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "Completed", completed_at: new Date().toISOString() })
        .eq("id", followUp.id);
      if (error) throw error;

      await supabase.from("activities").insert({
        prospect_id: followUp.prospectId,
        opportunity_id: followUp.opportunityId,
        user_id: followUp.ownerId,
        type: "followup_completed",
        description: "Follow-up completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.followUps() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("follow_ups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.followUps() }),
  });
}
