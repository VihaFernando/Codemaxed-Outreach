import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "./queries";
import type { ID, Prospect } from "./types";
import type { ProspectRow } from "@/lib/supabase/types";

function mapProspect(r: ProspectRow): Prospect {
  return {
    id: r["id"],
    company: r["company"],
    contactPerson: r["contact_person"],
    jobTitle: r["job_title"],
    email: r["email"],
    phone: r["phone"],
    website: r["website"],
    linkedinUrl: r["linkedin_url"],
    facebookUrl: r["facebook_url"],
    instagramUrl: r["instagram_url"],
    googleBusinessUrl: r["google_business_url"],
    otherUrl: r["other_url"],
    industry: r["industry"],
    location: r["location"],
    notes: r["notes"],
    ownerId: r["owner_id"],
    leadSourceId: r["lead_source_id"],
    createdAt: r["created_at"],
  };
}

async function fetchProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapProspect);
}

export function useProspects() {
  return useQuery({ queryKey: qk.prospects(), queryFn: fetchProspects });
}

export const getProspect = (prospects: Prospect[], id: ID) => prospects.find((p) => p.id === id);

export interface ProspectInput {
  company: string;
  contactPerson: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  googleBusinessUrl?: string;
  otherUrl?: string;
  industry?: string;
  location?: string;
  notes?: string;
  ownerId: ID;
  leadSourceId: ID;
  serviceTypeId?: ID;
  dealValue?: number;
}

export function useCreateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, actorId }: { input: ProspectInput; actorId: ID }) => {
      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .insert({
          company: input.company.trim(),
          contact_person: input.contactPerson.trim(),
          job_title: input.jobTitle ?? "",
          email: input.email ?? "",
          phone: input.phone ?? "",
          website: input.website ?? "",
          linkedin_url: input.linkedinUrl ?? "",
          facebook_url: input.facebookUrl ?? "",
          instagram_url: input.instagramUrl ?? "",
          google_business_url: input.googleBusinessUrl ?? "",
          other_url: input.otherUrl ?? "",
          industry: input.industry ?? "",
          location: input.location ?? "",
          notes: input.notes ?? "",
          owner_id: input.ownerId,
          lead_source_id: input.leadSourceId,
        })
        .select()
        .single();
      if (prospectError) throw prospectError;

      let opportunityId: ID | undefined;
      if (input.serviceTypeId) {
        const { data: opportunity, error: opportunityError } = await supabase
          .from("opportunities")
          .insert({
            prospect_id: prospect.id,
            service_type_id: input.serviceTypeId,
            owner_id: input.ownerId,
            status: "Draft",
            deal_value: input.dealValue ?? 0,
          })
          .select()
          .single();
        if (opportunityError) throw opportunityError;
        opportunityId = opportunity.id;
      }

      await supabase.from("activities").insert({
        prospect_id: prospect.id,
        opportunity_id: opportunityId ?? null,
        user_id: actorId,
        type: "prospect_created",
        description: `Prospect ${prospect.company} created`,
      });

      return { prospectId: prospect.id as ID, opportunityId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.prospects() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: ID; patch: Partial<ProspectInput> }) => {
      const dbPatch: Partial<ProspectRow> = {};
      if (patch.company !== undefined) dbPatch.company = patch.company;
      if (patch.contactPerson !== undefined) dbPatch.contact_person = patch.contactPerson;
      if (patch.jobTitle !== undefined) dbPatch.job_title = patch.jobTitle;
      if (patch.email !== undefined) dbPatch.email = patch.email;
      if (patch.phone !== undefined) dbPatch.phone = patch.phone;
      if (patch.website !== undefined) dbPatch.website = patch.website;
      if (patch.linkedinUrl !== undefined) dbPatch.linkedin_url = patch.linkedinUrl;
      if (patch.facebookUrl !== undefined) dbPatch.facebook_url = patch.facebookUrl;
      if (patch.instagramUrl !== undefined) dbPatch.instagram_url = patch.instagramUrl;
      if (patch.googleBusinessUrl !== undefined)
        dbPatch.google_business_url = patch.googleBusinessUrl;
      if (patch.otherUrl !== undefined) dbPatch.other_url = patch.otherUrl;
      if (patch.industry !== undefined) dbPatch.industry = patch.industry;
      if (patch.location !== undefined) dbPatch.location = patch.location;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.ownerId !== undefined) dbPatch.owner_id = patch.ownerId;
      if (patch.leadSourceId !== undefined) dbPatch.lead_source_id = patch.leadSourceId;
      const { error } = await supabase.from("prospects").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.prospects() }),
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: ID) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.prospects() });
      queryClient.invalidateQueries({ queryKey: qk.opportunities() });
      queryClient.invalidateQueries({ queryKey: qk.outreach() });
      queryClient.invalidateQueries({ queryKey: qk.activities() });
      queryClient.invalidateQueries({ queryKey: qk.followUps() });
      queryClient.invalidateQueries({ queryKey: qk.meetings() });
      queryClient.invalidateQueries({ queryKey: qk.proposals() });
      queryClient.invalidateQueries({ queryKey: qk.deals() });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Duplicate detection (pure, client-side over already-fetched data)   */
/* ------------------------------------------------------------------ */

export interface DuplicateMatch {
  prospect: Prospect;
  reasons: string[];
  score: number;
}

const norm = (v?: string | null) =>
  (v ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "").slice(-9);

export function findDuplicates(
  prospects: Prospect[],
  candidate: Partial<ProspectInput>,
  excludeId?: ID,
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const cName = norm(candidate.company);
  const cContact = norm(candidate.contactPerson);

  for (const p of prospects) {
    if (p.id === excludeId) continue;
    const reasons: string[] = [];
    const pName = norm(p.company);
    if (cName && pName) {
      if (pName === cName) reasons.push("Same company name");
      else if (pName.includes(cName) || cName.includes(pName)) reasons.push("Similar company name");
    }
    if (cContact && norm(p.contactPerson) === cContact) reasons.push("Same contact name");
    if (candidate.email && norm(candidate.email) === norm(p.email)) reasons.push("Same email");
    if (candidate.phone && digits(candidate.phone) && digits(candidate.phone) === digits(p.phone))
      reasons.push("Same phone number");
    if (candidate.website && norm(candidate.website) && norm(candidate.website) === norm(p.website))
      reasons.push("Same website");
    (
      [
        ["linkedinUrl", "Same LinkedIn URL"],
        ["facebookUrl", "Same Facebook URL"],
        ["instagramUrl", "Same Instagram URL"],
        ["googleBusinessUrl", "Same Google Business URL"],
      ] as const
    ).forEach(([key, label]) => {
      const c = norm(candidate[key]);
      if (c && c === norm(p[key])) reasons.push(label);
    });

    if (reasons.length) matches.push({ prospect: p, reasons, score: reasons.length });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}
