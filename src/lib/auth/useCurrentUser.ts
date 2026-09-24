import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@/lib/data/types";
import { useAuth } from "./AuthProvider";

function mapProfile(row: {
  id: string;
  name: string;
  role: User["role"];
  email: string;
  initials: string;
  active: boolean;
}): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    initials: row.initials,
    active: row.active,
  };
}

export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return mapProfile(data);
    },
    enabled: !!user,
  });
}
