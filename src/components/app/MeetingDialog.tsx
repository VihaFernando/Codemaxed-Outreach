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
import { useCreateMeeting } from "@/lib/data/meetings";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fromDateTimeInput, toDateInput } from "@/lib/data/dates";
import { MEETING_TYPES, type MeetingType } from "@/lib/data/types";

export function MeetingDialog({
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
  const createMeeting = useCreateMeeting();
  const [prospectId, setProspectId] = useState(fixedProspectId ?? "");
  const [opportunityId, setOpportunityId] = useState("");
  const [type, setType] = useState<MeetingType>("Sales Meeting");
  const [date, setDate] = useState(toDateInput(new Date().toISOString()));
  const [time, setTime] = useState("10:00");
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");

  useEffect(() => {
    if (!open) return;
    const pid = fixedProspectId ?? "";
    setProspectId(pid);
    setOpportunityId(pid ? (getOpportunities(allOpportunities, pid)[0]?.id ?? "") : "");
    setOwnerId(me?.id ?? "");
    setNotes("");
    setNextAction("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedProspectId, me?.id]);

  function save() {
    const scheduledAt = fromDateTimeInput(date, time);
    if (!prospectId || !opportunityId || !scheduledAt) {
      toast.error("Select a prospect, service opportunity and date");
      return;
    }
    createMeeting.mutate(
      {
        prospectId,
        opportunityId,
        ownerId,
        type,
        scheduledAt,
        status: "Scheduled",
        notes,
        nextAction,
      },
      {
        onSuccess: () => {
          toast.success("Meeting scheduled");
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to schedule meeting"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add meeting</DialogTitle>
          <DialogDescription>
            AI services use a Discovery Call as the qualification meeting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <OpportunityPicker
            prospectId={prospectId}
            opportunityId={opportunityId}
            onProspectChange={setProspectId}
            onOpportunityChange={setOpportunityId}
            {...(fixedProspectId ? { lockProspect: true } : {})}
          />
          <Field label="Meeting type">
            <Select value={type} onValueChange={(v) => setType(v as MeetingType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Next action">
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={createMeeting.isPending}>
            Schedule meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
