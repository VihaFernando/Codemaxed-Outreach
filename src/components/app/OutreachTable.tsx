import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "./EmptyState";
import { useProspects, getProspect } from "@/lib/data/prospects";
import { useOpportunities, prospectValue } from "@/lib/data/opportunities";
import { useOutreachTypes, useServiceTypes, useProfiles, nameOf } from "@/lib/data/referenceData";
import { useSetOutreachStatus, useDeleteOutreach } from "@/lib/data/outreach";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { formatCurrency, formatDate } from "@/lib/data/dates";
import { OUTREACH_STATUSES, type Outreach } from "@/lib/data/types";

export function OutreachTable({
  records,
  showOwner = true,
}: {
  records: Outreach[];
  showOwner?: boolean;
}) {
  const { data: prospects = [] } = useProspects();
  const { data: opportunities = [] } = useOpportunities();
  const { data: outreachTypes = [] } = useOutreachTypes();
  const { data: serviceTypes = [] } = useServiceTypes();
  const { data: users = [] } = useProfiles();
  const { data: me } = useCurrentUser();
  const setOutreachStatus = useSetOutreachStatus();
  const deleteOutreach = useDeleteOutreach();

  if (records.length === 0) {
    return <EmptyState title="No outreach records match your filters." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">Contact</th>
            <th className="px-3 py-2 font-medium">Platform</th>
            <th className="px-3 py-2 font-medium">Service</th>
            {showOwner ? <th className="px-3 py-2 font-medium">Owner</th> : null}
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Follow-up</th>
            <th className="px-3 py-2 text-right font-medium">Deal value</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((o) => {
            const prospect = getProspect(prospects, o.prospectId);
            return (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                  {formatDate(o.occurredAt)}
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link
                    to="/prospects/$prospectId"
                    params={{ prospectId: o.prospectId }}
                    className="hover:text-primary hover:underline"
                  >
                    {prospect?.company ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {prospect?.contactPerson ?? "—"}
                </td>
                <td className="px-3 py-2">{nameOf(outreachTypes, o.outreachTypeId)}</td>
                <td className="px-3 py-2">{nameOf(serviceTypes, o.serviceTypeId)}</td>
                {showOwner ? (
                  <td className="px-3 py-2 text-muted-foreground">{nameOf(users, o.ownerId)}</td>
                ) : null}
                <td className="px-3 py-2">
                  <Select
                    value={o.status}
                    onValueChange={(v) => {
                      if (!me) return;
                      setOutreachStatus.mutate(
                        { id: o.id, status: v as Outreach["status"], actorId: me.id },
                        {
                          onSuccess: () => toast.success(`Status updated to ${v}`),
                          onError: (err) =>
                            toast.error(
                              err instanceof Error ? err.message : "Failed to update status",
                            ),
                        },
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 w-[168px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTREACH_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap px-3 py-2 numeric text-muted-foreground">
                  {o.followUpAt ? formatDate(o.followUpAt) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right numeric">
                  {formatCurrency(prospectValue(opportunities, o.prospectId))}
                </td>
                <td className="px-3 py-2 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Delete outreach">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this outreach record?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the record and its metrics. The prospect stays in your list.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            deleteOutreach.mutate(o.id, {
                              onSuccess: () => toast.success("Outreach deleted"),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error ? err.message : "Failed to delete",
                                ),
                            });
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
