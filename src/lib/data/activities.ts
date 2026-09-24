import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { Activity, ID } from "./types";

function mapActivity(r: {
  id: string;
  prospect_id: string;
  opportunity_id: string | null;
  user_id: string;
  type: Activity["type"];
  description: string;
  occurred_at: string;
}): Activity {
  return {
    id: r.id,
    prospectId: r.prospect_id,
    opportunityId: r.opportunity_id,
    userId: r.user_id,
    type: r.type,
    description: r.description,
    occurredAt: r.occurred_at,
  };
}

async function fetchActivities(prospectId?: ID): Promise<Activity[]> {
  let query = supabase.from("activities").select("*").order("occurred_at", { ascending: false });
  if (prospectId) query = query.eq("prospect_id", prospectId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapActivity);
}

export function useActivities(prospectId?: ID) {
  return useQuery({
    queryKey: qk.activities(prospectId),
    queryFn: () => fetchActivities(prospectId),
  });
}

export function useAddNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      prospectId,
      description,
      opportunityId,
      actorId,
    }: {
      prospectId: ID;
      description: string;
      opportunityId?: ID | null;
      actorId: ID;
    }) => {
      const { error } = await supabase.from("activities").insert({
        prospect_id: prospectId,
        opportunity_id: opportunityId ?? null,
        user_id: actorId,
        type: "note_added",
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities"] }),
  });
}
