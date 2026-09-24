import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  useCreateReference,
  useDeleteReference,
  useOutreachTypes,
  useProfiles,
  useServiceTypes,
  useLeadSources,
  useUpdateProfile,
  useUpdateReference,
} from "@/lib/data/referenceData";
import { useOutreach } from "@/lib/data/outreach";
import { useOpportunities } from "@/lib/data/opportunities";
import { useProspects } from "@/lib/data/prospects";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { OUTREACH_STATUSES } from "@/lib/data/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CodeMaxed Outreach Hub" },
      {
        name: "description",
        content:
          "Manage team members, outreach platforms, service types, lead sources and pipeline statuses.",
      },
      { property: "og:title", content: "Settings — CodeMaxed Outreach Hub" },
      {
        property: "og:description",
        content:
          "Manage team members, outreach platforms, service types, lead sources and pipeline statuses.",
      },
    ],
  }),
  component: SettingsPage,
});

type RefKind = "outreachTypes" | "serviceTypes" | "leadSources";

function useReferenceItems(kind: RefKind) {
  const outreachTypes = useOutreachTypes();
  const serviceTypes = useServiceTypes();
  const leadSources = useLeadSources();
  if (kind === "outreachTypes") return outreachTypes;
  if (kind === "serviceTypes") return serviceTypes;
  return leadSources;
}

function ReferenceList({
  kind,
  title,
  description,
}: {
  kind: RefKind;
  title: string;
  description: string;
}) {
  const { data: items = [] } = useReferenceItems(kind);
  const { data: outreach = [] } = useOutreach();
  const { data: opportunities = [] } = useOpportunities();
  const { data: prospects = [] } = useProspects();
  const [name, setName] = useState("");

  const createRef = useCreateReference(kind);
  const updateRef = useUpdateReference(kind);
  const deleteRef = useDeleteReference(kind);

  function usageOf(id: string) {
    if (kind === "outreachTypes") return outreach.filter((o) => o.outreachTypeId === id).length;
    if (kind === "serviceTypes") return opportunities.filter((o) => o.serviceTypeId === id).length;
    return prospects.filter((p) => p.leadSourceId === id).length;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}`}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            disabled={createRef.isPending}
            onClick={() => {
              if (!name.trim()) return;
              createRef.mutate(name.trim(), {
                onSuccess: () => {
                  setName("");
                  toast.success("Added");
                },
                onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add"),
              });
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <div className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => {
            const usage = usageOf(item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1 text-sm font-medium">{item.name}</span>
                {kind === "serviceTypes" &&
                "usesDiscoveryCall" in item &&
                item.usesDiscoveryCall ? (
                  <Badge variant="secondary">Discovery call</Badge>
                ) : null}
                <span className="numeric text-xs text-muted-foreground">{usage} in use</span>
                <Switch
                  checked={item.active}
                  onCheckedChange={(v) => {
                    updateRef.mutate(
                      { id: item.id, patch: { active: v } },
                      { onSuccess: () => toast.success(v ? "Activated" : "Deactivated") },
                    );
                  }}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" disabled={usage > 0}>
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This entry is not used by any record, so it can be removed safely.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteRef.mutate(item.id, { onSuccess: () => toast.success("Deleted") });
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const { data: users = [] } = useProfiles();
  const { data: me } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const canManageOthers = me?.role === "Admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team members</CardTitle>
        <p className="text-sm text-muted-foreground">
          New team members get access by signing up at the login page; they appear here
          automatically.
          {canManageOthers ? "" : " Only Admins can deactivate another member."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y divide-border rounded-md border border-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {u.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.role} · {u.email}
                </p>
              </div>
              <Switch
                checked={u.active}
                disabled={u.id !== me?.id && !canManageOthers}
                onCheckedChange={(v) => {
                  updateProfile.mutate(
                    { id: u.id, patch: { active: v } },
                    {
                      onError: (err) =>
                        toast.error(err instanceof Error ? err.message : "Failed to update"),
                    },
                  );
                }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Reference data used across the whole workspace." />

      <Tabs defaultValue="team">
        <TabsList className="flex-wrap">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="outreach">Outreach types</TabsTrigger>
          <TabsTrigger value="services">Service types</TabsTrigger>
          <TabsTrigger value="sources">Lead sources</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline statuses</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
          <TeamMembers />
        </TabsContent>
        <TabsContent value="outreach" className="mt-4">
          <ReferenceList
            kind="outreachTypes"
            title="Outreach types"
            description="Platforms available when logging outreach. Deactivate to hide from new records."
          />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <ReferenceList
            kind="serviceTypes"
            title="Service types"
            description="Services you sell. Names containing “AI” qualify through a discovery call."
          />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <ReferenceList
            kind="leadSources"
            title="Lead sources"
            description="Where prospects originally came from."
          />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline statuses</CardTitle>
              <p className="text-sm text-muted-foreground">
                The fixed status ladder every outreach record and opportunity follows.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {OUTREACH_STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <p className="text-sm text-muted-foreground">
                All data is stored in Supabase (Postgres) and shared live across the whole team.
              </p>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
