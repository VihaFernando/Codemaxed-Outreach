import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "./Field";
import { StatusBadge } from "./StatusBadge";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
  useProspects,
  useCreateProspect,
  useUpdateProspect,
  findDuplicates,
  type ProspectInput,
} from "@/lib/data/prospects";
import { useOpportunities, prospectStatus } from "@/lib/data/opportunities";
import { useOutreach, getProspectOutreach } from "@/lib/data/outreach";
import {
  useLeadSources,
  useProfiles,
  useServiceTypes,
  useOutreachTypes,
  getSalesUsers,
  nameOf,
} from "@/lib/data/referenceData";
import { formatDate } from "@/lib/data/dates";
import type { Prospect } from "@/lib/data/types";

const EMPTY = {
  company: "",
  contactPerson: "",
  jobTitle: "",
  email: "",
  phone: "",
  website: "",
  linkedinUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  googleBusinessUrl: "",
  otherUrl: "",
  industry: "",
  location: "",
  notes: "",
  dealValue: "",
};

export function ProspectDialog({
  open,
  onOpenChange,
  prospect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect;
}) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const { data: allUsers = [] } = useProfiles();
  const { data: allServiceTypes = [] } = useServiceTypes();
  const { data: allOutreachTypes = [] } = useOutreachTypes();
  const { data: allLeadSources = [] } = useLeadSources();
  const { data: allProspects = [] } = useProspects();
  const { data: allOpportunities = [] } = useOpportunities();
  const { data: allOutreach = [] } = useOutreach();
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();

  const users = getSalesUsers(allUsers);
  const services = allServiceTypes.filter((t) => t.active);
  const sources = allLeadSources.filter((t) => t.active);

  const [form, setForm] = useState({ ...EMPTY });
  const [ownerId, setOwnerId] = useState(me?.id ?? "");
  const [leadSourceId, setLeadSourceId] = useState(sources[0]?.id ?? "");
  const [serviceTypeId, setServiceTypeId] = useState(services[0]?.id ?? "");
  const [forceCreate, setForceCreate] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForceCreate(false);
    if (prospect) {
      setForm({
        company: prospect.company,
        contactPerson: prospect.contactPerson,
        jobTitle: prospect.jobTitle,
        email: prospect.email,
        phone: prospect.phone,
        website: prospect.website,
        linkedinUrl: prospect.linkedinUrl,
        facebookUrl: prospect.facebookUrl,
        instagramUrl: prospect.instagramUrl,
        googleBusinessUrl: prospect.googleBusinessUrl,
        otherUrl: prospect.otherUrl,
        industry: prospect.industry,
        location: prospect.location,
        notes: prospect.notes,
        dealValue: "",
      });
      setOwnerId(prospect.ownerId);
      setLeadSourceId(prospect.leadSourceId);
    } else {
      setForm({ ...EMPTY });
      setOwnerId(me?.id ?? "");
      setLeadSourceId(sources[0]?.id ?? "");
      setServiceTypeId(services[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prospect?.id, me?.id]);

  const duplicates = useMemo(
    () =>
      open
        ? findDuplicates(
            allProspects,
            { ...form, dealValue: Number(form.dealValue) || 0 } satisfies Partial<ProspectInput>,
            prospect?.id,
          )
        : [],
    [allProspects, form, open, prospect?.id],
  );

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const blocked = !prospect && duplicates.length > 0 && !forceCreate;

  function save() {
    if (!form.company.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (prospect) {
      const { dealValue: _dealValue, ...formWithoutDealValue } = form;
      updateProspect.mutate(
        {
          id: prospect.id,
          patch: {
            ...formWithoutDealValue,
            ownerId,
            leadSourceId,
          },
        },
        {
          onSuccess: () => {
            toast.success("Prospect updated");
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to update prospect"),
        },
      );
      return;
    }
    if (!me) return;
    createProspect.mutate(
      {
        input: {
          ...form,
          dealValue: Number(form.dealValue) || 0,
          ownerId,
          leadSourceId,
          serviceTypeId,
        },
        actorId: me.id,
      },
      {
        onSuccess: ({ prospectId }) => {
          toast.success(`${form.company} added to prospects`);
          onOpenChange(false);
          navigate({ to: "/prospects/$prospectId", params: { prospectId } });
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to create prospect"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{prospect ? "Edit prospect" : "Add prospect"}</DialogTitle>
          <DialogDescription>
            Existing records are checked automatically to avoid duplicate companies.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / business name">
            <Input value={form.company} onChange={(e) => set("company")(e.target.value)} />
          </Field>
          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              onChange={(e) => set("contactPerson")(e.target.value)}
            />
          </Field>
          <Field label="Job title">
            <Input value={form.jobTitle} onChange={(e) => set("jobTitle")(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => set("email")(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => set("website")(e.target.value)} />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={form.linkedinUrl} onChange={(e) => set("linkedinUrl")(e.target.value)} />
          </Field>
          <Field label="Facebook URL">
            <Input value={form.facebookUrl} onChange={(e) => set("facebookUrl")(e.target.value)} />
          </Field>
          <Field label="Instagram URL">
            <Input
              value={form.instagramUrl}
              onChange={(e) => set("instagramUrl")(e.target.value)}
            />
          </Field>
          <Field label="Google Business URL">
            <Input
              value={form.googleBusinessUrl}
              onChange={(e) => set("googleBusinessUrl")(e.target.value)}
            />
          </Field>
          <Field label="Other URL">
            <Input value={form.otherUrl} onChange={(e) => set("otherUrl")(e.target.value)} />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={(e) => set("industry")(e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set("location")(e.target.value)} />
          </Field>
          <Field label="Assigned team member">
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Lead source">
            <Select value={leadSourceId} onValueChange={setLeadSourceId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!prospect ? (
            <>
              <Field label="Potential service">
                <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Estimated deal value (LKR)">
                <Input
                  type="number"
                  value={form.dealValue}
                  onChange={(e) => set("dealValue")(e.target.value)}
                />
              </Field>
            </>
          ) : null}
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
          </Field>
        </div>

        {duplicates.length && !prospect ? (
          <div className="rounded-lg border border-warning bg-warning-soft/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="size-4" /> Possible existing prospect
            </div>
            <div className="mt-3 space-y-3">
              {duplicates.map(({ prospect: dup, reasons }) => {
                const history = getProspectOutreach(allOutreach, dup.id).slice(0, 3);
                return (
                  <div key={dup.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{dup.company}</p>
                        <p className="text-xs text-muted-foreground">
                          Matched because: {reasons.join(", ")}
                        </p>
                      </div>
                      <StatusBadge status={prospectStatus(allOpportunities, dup.id)} />
                    </div>
                    {history.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {history.map((h) => (
                          <li key={h.id} className="flex flex-wrap gap-2">
                            <span>{nameOf(allOutreachTypes, h.outreachTypeId)}</span>
                            <span>· {nameOf(allServiceTypes, h.serviceTypeId)}</span>
                            <span>· {formatDate(h.occurredAt)}</span>
                            <span>· {h.status}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          navigate({
                            to: "/prospects/$prospectId",
                            params: { prospectId: dup.id },
                          });
                        }}
                      >
                        View existing prospect
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onOpenChange(false);
                          toast.info(`Using existing record for ${dup.company}`);
                          navigate({
                            to: "/prospects/$prospectId",
                            params: { prospectId: dup.id },
                          });
                        }}
                      >
                        This is the same prospect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!forceCreate ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => setForceCreate(true)}
              >
                Create as new prospect anyway
              </Button>
            ) : (
              <p className="mt-3 text-xs text-warning-foreground">
                Creating as a new prospect — duplicates acknowledged.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={blocked || createProspect.isPending || updateProspect.isPending}
          >
            {createProspect.isPending || updateProspect.isPending
              ? "Saving…"
              : prospect
                ? "Save changes"
                : "Create prospect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
