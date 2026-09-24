import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { OpportunityPicker } from "./OpportunityPicker";
import { useOpportunities, getOpportunities, getOpportunity } from "@/lib/data/opportunities";
import { useProfiles, getSalesUsers } from "@/lib/data/referenceData";
import { useCreateProposal } from "@/lib/data/proposals";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fromDateTimeInput, toDateInput } from "@/lib/data/dates";
import { PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/data/types";

export function ProposalDialog({
  open,
  onOpenChange,
  prospectId: fixedProspectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string;
}) {
  const { data: allOpportunities = [] } = useOpportunities();
  const { data: profiles = [] } = useProfiles();
  const { data: me } = useCurrentUser();
  const users = getSalesUsers(profiles);
  const createProposal = useCreateProposal();
  const [prospectId, setProspectId] = useState(fixedProspectId ?? "");
  const [opportunityId, setOpportunityId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<ProposalStatus>("Sent");
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const pid = fixedProspectId ?? "";
    setProspectId(pid);
    const opp = pid ? getOpportunities(allOpportunities, pid)[0] : undefined;
    setOpportunityId(opp?.id ?? "");
    setAmount(opp?.dealValue ? String(opp.dealValue) : "");
    setOwnerId(me?.id ?? "");
    setStatus("Sent");
    setNotes("");
    setFollowUp("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedProspectId, me?.id]);

  function save() {
    const sentAt = fromDateTimeInput(date, "10:00");
    const opp = getOpportunity(allOpportunities, opportunityId);
    if (!prospectId || !opp || !sentAt) {
      toast.error("Select a prospect, service opportunity and date");
      return;
    }
    createProposal.mutate(
      {
        prospectId,
        opportunityId: opp.id,
        serviceTypeId: opp.serviceTypeId,
        ownerId,
        sentAt,
        amount: Number(amount) || opp.dealValue,
        status,
        followUpAt: followUp ? fromDateTimeInput(followUp, "09:00") : null,
        notes,
      },
      {
        onSuccess: () => {
          toast.success("Proposal created");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to create proposal"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add proposal</DialogTitle>
          <DialogDescription>
            Moves the opportunity to the Proposal stage and updates every dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <OpportunityPicker
            prospectId={prospectId}
            opportunityId={opportunityId}
            onProspectChange={setProspectId}
            onOpportunityChange={(id) => {
              setOpportunityId(id);
              const opp = getOpportunity(allOpportunities, id);
              if (opp?.dealValue) setAmount(String(opp.dealValue));
            }}
            {...(fixedProspectId ? { lockProspect: true } : {})}
          />
          <Field label="Owner">
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
          <Field label="Proposal date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Amount (LKR)">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={(v) => setStatus(v as ProposalStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Follow-up date">
            <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={createProposal.isPending}>
            Save proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
