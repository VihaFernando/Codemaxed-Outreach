import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { Notification } from "./types";

function mapNotification(r: {
  id: string;
  title: string;
  body: string;
  kind: Notification["kind"];
  created_at: string;
  read: boolean;
}): Notification {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    kind: r.kind,
    createdAt: r.created_at,
    read: r.read,
  };
}

async function fetchNotifications(userId?: string): Promise<Notification[]> {
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (userId) query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapNotification);
}

export function useNotifications(userId?: string) {
  return useQuery({ queryKey: qk.notifications(), queryFn: () => fetchNotifications(userId) });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.notifications() }),
  });
}
