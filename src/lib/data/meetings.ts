import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { ID, Meeting } from "./types";
import type { MeetingRow } from "@/lib/supabase/types";

function mapMeeting(r: MeetingRow): Meeting {
  return {
    id: r["id"],
    prospectId: r["prospect_id"],
    opportunityId: r["opportunity_id"],
    ownerId: r["owner_id"],
    type: r["type"],
    scheduledAt: r["scheduled_at"],
    status: r["status"],
    notes: r["notes"],
    nextAction: r["next_action"],
  };
}

async function fetchMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data.map(mapMeeting);
}

export function useMeetings() {
  return useQuery({ queryKey: qk.meetings(), queryFn: fetchMeetings });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Meeting, "id">) => {
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          prospect_id: input.prospectId,
          opportunity_id: input.opportunityId,
          owner_id: input.ownerId,
          type: input.type,
          scheduled_at: input.scheduledAt,
          status: input.status,
          notes: input.notes,
          next_action: input.nextAction,
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
      if (opp && STATUS_RANK[opp["status"]]! < 4) {
        await supabase
          .from("opportunities")
          .update({ status: input.type === "Discovery Call" ? "Discovery Call" : "Meeting Booked" })
          .eq("id", input.opportunityId);
      }

      await supabase.from("activities").insert({
        prospect_id: input.prospectId,
        opportunity_id: input.opportunityId,
        user_id: input.ownerId,
        type: "meeting_booked",
        description: `${input.type} scheduled`,
        occurred_at: input.scheduledAt,
      });

      return data.id as ID;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.meetings() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meeting, patch }: { meeting: Meeting; patch: Partial<Meeting> }) => {
      const dbPatch: Partial<MeetingRow> = {};
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.scheduledAt !== undefined) dbPatch.scheduled_at = patch.scheduledAt;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.nextAction !== undefined) dbPatch.next_action = patch.nextAction;
      const { error } = await supabase.from("meetings").update(dbPatch).eq("id", meeting.id);
      if (error) throw error;

      if (patch.status === "Completed" && meeting.status !== "Completed") {
        await supabase.from("activities").insert({
          prospect_id: meeting.prospectId,
          opportunity_id: meeting.opportunityId,
          user_id: meeting.ownerId,
          type: "meeting_completed",
          description: `${meeting.type} completed`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.meetings() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.meetings() }),
  });
}
