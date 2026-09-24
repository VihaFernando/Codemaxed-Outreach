import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { ID, LeadSource, OutreachType, ServiceType, User } from "./types";
import { qk } from "./queries";

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

async function fetchOutreachTypes(): Promise<OutreachType[]> {
  const { data, error } = await supabase.from("outreach_types").select("*").order("name");
  if (error) throw error;
  return data.map((r) => ({ id: r["id"], name: r["name"], active: r["active"] }));
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const { data, error } = await supabase.from("service_types").select("*").order("name");
  if (error) throw error;
  return data.map((r) => ({
    id: r["id"],
    name: r["name"],
    usesDiscoveryCall: r["uses_discovery_call"],
    active: r["active"],
  }));
}

async function fetchLeadSources(): Promise<LeadSource[]> {
  const { data, error } = await supabase.from("lead_sources").select("*").order("name");
  if (error) throw error;
  return data.map((r) => ({ id: r["id"], name: r["name"], active: r["active"] }));
}

async function fetchProfiles(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) throw error;
  return data.map((r) => ({
    id: r["id"],
    name: r["name"],
    role: r["role"],
    email: r["email"],
    initials: r["initials"],
    active: r["active"],
  }));
}

export function useOutreachTypes() {
  return useQuery({ queryKey: qk.outreachTypes(), queryFn: fetchOutreachTypes });
}
export function useServiceTypes() {
  return useQuery({ queryKey: qk.serviceTypes(), queryFn: fetchServiceTypes });
}
export function useLeadSources() {
  return useQuery({ queryKey: qk.leadSources(), queryFn: fetchLeadSources });
}
export function useProfiles() {
  return useQuery({ queryKey: qk.profiles(), queryFn: fetchProfiles });
}

export const getSalesUsers = (users: User[]) => users.filter((u) => u.role !== "Admin");
export const getUser = (users: User[], id?: ID | null): User | undefined =>
  users.find((u) => u.id === id);
export const nameOf = (list: Array<{ id: ID; name: string }>, id?: ID | null, fallback = "—") =>
  list.find((i) => i.id === id)?.name ?? fallback;

/* ------------------------------------------------------------------ */
/* Writes                                                               */
/* ------------------------------------------------------------------ */

type RefKind = "outreachTypes" | "serviceTypes" | "leadSources";

const QK_BY_KIND: Record<RefKind, () => readonly unknown[]> = {
  outreachTypes: qk.outreachTypes,
  serviceTypes: qk.serviceTypes,
  leadSources: qk.leadSources,
};

export function useCreateReference(kind: RefKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const error =
        kind === "outreachTypes"
          ? (await supabase.from("outreach_types").insert({ name })).error
          : kind === "serviceTypes"
            ? (
                await supabase
                  .from("service_types")
                  .insert({ name, uses_discovery_call: /\bai\b/i.test(name) })
              ).error
            : (await supabase.from("lead_sources").insert({ name })).error;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK_BY_KIND[kind]() }),
  });
}

export function useUpdateReference(kind: RefKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: ID; patch: { active?: boolean; name?: string } }) => {
      const error =
        kind === "outreachTypes"
          ? (await supabase.from("outreach_types").update(patch).eq("id", id)).error
          : kind === "serviceTypes"
            ? (await supabase.from("service_types").update(patch).eq("id", id)).error
            : (await supabase.from("lead_sources").update(patch).eq("id", id)).error;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK_BY_KIND[kind]() }),
  });
}

export function useDeleteReference(kind: RefKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const error =
        kind === "outreachTypes"
          ? (await supabase.from("outreach_types").delete().eq("id", id)).error
          : kind === "serviceTypes"
            ? (await supabase.from("service_types").delete().eq("id", id)).error
            : (await supabase.from("lead_sources").delete().eq("id", id)).error;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK_BY_KIND[kind]() }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: ID;
      patch: Partial<Pick<User, "active" | "name" | "role">>;
    }) => {
      const dbPatch: { active?: boolean; name?: string; role?: User["role"] } = {};
      if (patch.active !== undefined) dbPatch.active = patch.active;
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.role !== undefined) dbPatch.role = patch.role;
      const { error } = await supabase.from("profiles").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profiles() });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
