import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { ID, OutreachTypeTarget, Target, TargetMetric, TargetTier } from "./types";
import type { OutreachTypeTargetRow, TargetRow } from "@/lib/supabase/types";

function mapTarget(r: TargetRow): Target {
  return {
    id: r["id"],
    userId: r["user_id"],
    metric: r["metric"],
    minimum: Number(r["minimum"]),
    average: Number(r["average"]),
    stretch: Number(r["stretch"]),
    effectiveFrom: r["effective_from"],
    updatedAt: r["updated_at"],
  };
}

function mapOutreachTypeTarget(r: OutreachTypeTargetRow): OutreachTypeTarget {
  return {
    id: r["id"],
    userId: r["user_id"],
    outreachTypeId: r["outreach_type_id"],
    minimum: Number(r["minimum"]),
    average: Number(r["average"]),
    stretch: Number(r["stretch"]),
    updatedAt: r["updated_at"],
  };
}

async function fetchTargets(): Promise<Target[]> {
  const { data, error } = await supabase.from("targets").select("*");
  if (error) throw error;
  return data.map(mapTarget);
}

async function fetchOutreachTypeTargets(): Promise<OutreachTypeTarget[]> {
  const { data, error } = await supabase.from("outreach_type_targets").select("*");
  if (error) throw error;
  return data.map(mapOutreachTypeTarget);
}

export function useTargets() {
  return useQuery({ queryKey: qk.targets(), queryFn: fetchTargets });
}

export function useOutreachTypeTargets() {
  return useQuery({ queryKey: qk.outreachTypeTargets(), queryFn: fetchOutreachTypeTargets });
}

export const getTargets = (targets: Target[], userId?: ID) =>
  targets.filter((t) => !userId || t.userId === userId);

export function tierValue(
  target: { minimum: number; average: number; stretch: number } | undefined,
  tier: TargetTier,
) {
  if (!target) return 0;
  return target[tier];
}

export function useUpsertTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      metric,
      patch,
    }: {
      userId: ID;
      metric: TargetMetric;
      patch: { minimum?: number; average?: number; stretch?: number };
    }) => {
      const { error } = await supabase.from("targets").upsert(
        {
          user_id: userId,
          metric,
          ...(patch.minimum !== undefined ? { minimum: patch.minimum } : {}),
          ...(patch.average !== undefined ? { average: patch.average } : {}),
          ...(patch.stretch !== undefined ? { stretch: patch.stretch } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,metric" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.targets() }),
  });
}

export function useUpsertOutreachTypeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      outreachTypeId,
      patch,
    }: {
      userId: ID;
      outreachTypeId: ID;
      patch: { minimum?: number; average?: number; stretch?: number };
    }) => {
      const { error } = await supabase.from("outreach_type_targets").upsert(
        {
          user_id: userId,
          outreach_type_id: outreachTypeId,
          ...(patch.minimum !== undefined ? { minimum: patch.minimum } : {}),
          ...(patch.average !== undefined ? { average: patch.average } : {}),
          ...(patch.stretch !== undefined ? { stretch: patch.stretch } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,outreach_type_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.outreachTypeTargets() }),
  });
}
