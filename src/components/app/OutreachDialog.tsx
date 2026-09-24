import { useEffect, useMemo, useState } from "react";
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
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useProspects, useCreateProspect, findDuplicates } from "@/lib/data/prospects";
import { useCreateOutreach, useOutreach, getProspectOutreach } from "@/lib/data/outreach";
import {
  useOutreachTypes,
  useServiceTypes,
  useLeadSources,
  useProfiles,
  getSalesUsers,
  nameOf,
} from "@/lib/data/referenceData";
import { formatDate, fromDateTimeInput, toDateInput, toTimeInput } from "@/lib/data/dates";

const NEW_PROSPECT = "__new__";

export function OutreachDialog({
  open,
  onOpenChange,
  prospectId: fixedProspectId,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string;
  opportunityId?: string;
}) {
  const { data: me } = useCurrentUser();
  const { data: allUsers = [] } = useProfiles();
  const { data: allOutreachTypes = [] } = useOutreachTypes();
  const { data: allServiceTypes = [] } = useServiceTypes();
  const { data: allLeadSources = [] } = useLeadSources();
  const { data: allProspects = [] } = useProspects();
  const { data: allOutreach = [] } = useOutreach();
  const createProspect = useCreateProspect();
  const createOutreach = useCreateOutreach();

  const users = getSalesUsers(allUsers);
  const platforms = allOutreachTypes.filter((t) => t.active);
  const services = allServiceTypes.filter((t) => t.active);
  const sources = allLeadSources.filter((t) => t.active);

  const [prospectId, setProspectId] = useState(fixedProspectId ?? "");
  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [outreachTypeId, setOutreachTypeId] = useState(platforms[0]?.id ?? "");
  const [serviceTypeId, setServiceTypeId] = useState(services[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(me?.id ?? "");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [time, setTime] = useState(toTimeInput(new Date().toISOString()));
  const [message, setMessage] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProspectId(fixedProspectId ?? "");
    setCompany("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setWebsite("");
    setMessage("");
    setFollowUp("");
    setDealValue("");
    setAcknowledged(false);
    setOwnerId(me?.id ?? "");
    setDate(toDateInput(new Date().toISOString()));
    setTime(toTimeInput(new Date().toISOString()));
  }, [open, fixedProspectId, me?.id]);

  const creatingNew = prospectId === NEW_PROSPECT;

  const duplicates = useMemo(
    () =>
      creatingNew
        ? findDuplicates(allProspects, { company, contactPerson, email, phone, website })
        : [],
    [creatingNew, allProspects, company, contactPerson, email, phone, website],
  );

  const prospects = useMemo(
    () => allProspects.slice().sort((a, b) => a.company.localeCompare(b.company)),
    [allProspects],
  );

  function save() {
    const occurredAt = fromDateTimeInput(date, time);
    if (!occurredAt) {
      toast.error("Pick a valid date");
      return;
    }
    if (!me) return;

    function submitOutreach(targetProspectId: string) {
      createOutreach.mutate(
        {
          prospectId: targetProspectId,
          ...(opportunityId ? { opportunityId } : {}),
          serviceTypeId,
          outreachTypeId,
          ownerId,
          occurredAt: occurredAt!,
          message,
          followUpAt: followUp ? fromDateTimeInput(followUp, "09:00") : null,
          status: "Sent",
          dealValue: Number(dealValue) || 0,
          outreachTypes: allOutreachTypes,
          serviceTypes: allServiceTypes,
        },
        {
          onSuccess: () => {
            toast.success("Outreach recorded", {
              description: "Dashboards, funnel and targets have been updated.",
            });
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to record outreach"),
        },
      );
    }

    if (creatingNew) {
      if (!company.trim()) {
        toast.error("Company name is required");
        return;
      }
      if (duplicates.length && !acknowledged) {
        toast.error("Review the possible duplicate first");
        return;
      }
      createProspect.mutate(
        {
          input: {
            company,
            contactPerson,
            email,
            phone,
            website,
            ownerId,
            leadSourceId: sources[0]?.id ?? "",
            serviceTypeId,
            dealValue: Number(dealValue) || 0,
          },
          actorId: me.id,
        },
        {
          onSuccess: ({ prospectId: createdId }) => submitOutreach(createdId),
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to create prospect"),
        },
      );
      return;
    }

    if (!prospectId) {
      toast.error("Select a prospect");
      return;
    }
    submitOutreach(prospectId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add outreach</DialogTitle>
          <DialogDescription>
            Logs the touch, updates the pipeline stage and refreshes every dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {!fixedProspectId ? (
            <Field label="Company / prospect" className="sm:col-span-2">
              <Select value={prospectId} onValueChange={setProspectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a prospect" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={NEW_PROSPECT}>+ New company</SelectItem>
                  {prospects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.company} — {p.contactPerson}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {creatingNew ? (
            <>
              <Field label="Company name">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              <Field label="Contact person">
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Website" className="sm:col-span-2">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
            </>
          ) : null}

          <Field label="Outreach platform">
            <Select value={outreachTypeId} onValueChange={setOutreachTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Service type">
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
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
          <Field label="Estimated deal value (LKR)">
            <Input type="number" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
          </Field>
          <Field label="Follow-up date">
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </Field>
          <Field label="Message / notes" className="sm:col-span-2">
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        </div>

        {duplicates.length ? (
          <div className="rounded-lg border border-warning bg-warning-soft/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="size-4" /> Possible existing prospect
            </div>
            <div className="mt-3 space-y-3">
              {duplicates.map(({ prospect, reasons }) => (
                <div key={prospect.id} className="rounded-md border border-border bg-card p-3">
                  <p className="text-sm font-medium">{prospect.company}</p>
                  <p className="text-xs text-muted-foreground">
                    Matched because: {reasons.join(", ")}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {getProspectOutreach(allOutreach, prospect.id)
                      .slice(0, 3)
                      .map((h) => (
                        <li key={h.id}>
                          {nameOf(allOutreachTypes, h.outreachTypeId)} ·{" "}
                          {nameOf(allServiceTypes, h.serviceTypeId)} · {formatDate(h.occurredAt)} ·{" "}
                          {h.status}
                        </li>
                      ))}
                  </ul>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => {
                      setProspectId(prospect.id);
                      toast.info(`Logging against ${prospect.company}`);
                    }}
                  >
                    This is the same prospect
                  </Button>
                </div>
              ))}
            </div>
            {!acknowledged ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => setAcknowledged(true)}
              >
                Create as new prospect anyway
              </Button>
            ) : (
              <p className="mt-3 text-xs text-warning-foreground">
                Duplicates acknowledged — a new prospect will be created.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={createOutreach.isPending || createProspect.isPending}>
            {createOutreach.isPending || createProspect.isPending ? "Saving…" : "Save outreach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
