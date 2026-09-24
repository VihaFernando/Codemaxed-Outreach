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
import { useOpportunities, getOpportunities } from "@/lib/data/opportunities";
import { useProfiles, getSalesUsers } from "@/lib/data/referenceData";
import { useCreateFollowUp, useUpdateFollowUp } from "@/lib/data/followUps";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fromDateTimeInput, toDateInput, toTimeInput } from "@/lib/data/dates";
import type { FollowUp } from "@/lib/data/types";

export function FollowUpDialog({
  open,
  onOpenChange,
  prospectId: fixedProspectId,
  followUp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string;
  followUp?: FollowUp;
}) {
  const { data: allOpportunities = [] } = useOpportunities();
  const { data: profiles = [] } = useProfiles();
  const { data: me } = useCurrentUser();
  const users = getSalesUsers(profiles);
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();
  const [prospectId, setProspectId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (followUp) {
      setProspectId(followUp.prospectId);
      setOpportunityId(followUp.opportunityId);
      setOwnerId(followUp.ownerId);
      setDate(toDateInput(followUp.dueAt));
      setTime(toTimeInput(followUp.dueAt));
      setNotes(followUp.notes);
      return;
    }
    const pid = fixedProspectId ?? "";
    setProspectId(pid);
    setOpportunityId(pid ? (getOpportunities(allOpportunities, pid)[0]?.id ?? "") : "");
    setOwnerId(me?.id ?? "");
    setDate(toDateInput(new Date().toISOString()));
    setTime("09:00");
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedProspectId, followUp?.id, me?.id]);

  function save() {
    const dueAt = fromDateTimeInput(date, time);
    if (!prospectId || !opportunityId || !dueAt) {
      toast.error("Select a prospect, service opportunity and date");
      return;
    }
    if (followUp) {
      updateFollowUp.mutate(
        { id: followUp.id, patch: { dueAt, notes, ownerId, status: "Pending" } },
        {
          onSuccess: () => {
            toast.success("Follow-up rescheduled");
            onOpenChange(false);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to reschedule"),
        },
      );
    } else {
      createFollowUp.mutate(
        { prospectId, opportunityId, ownerId, dueAt, notes },
        {
          onSuccess: () => {
            toast.success("Follow-up scheduled");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to schedule"),
        },
      );
    }
  }

  const isPending = createFollowUp.isPending || updateFollowUp.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{followUp ? "Reschedule follow-up" : "Schedule follow-up"}</DialogTitle>
          <DialogDescription>
            Keeps the company timeline and follow-up queue in sync.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <OpportunityPicker
            prospectId={prospectId}
            opportunityId={opportunityId}
            onProspectChange={setProspectId}
            onOpportunityChange={setOpportunityId}
            {...(fixedProspectId || followUp ? { lockProspect: true } : {})}
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
          <Field label="Due date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isPending}>
            {followUp ? "Reschedule" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
