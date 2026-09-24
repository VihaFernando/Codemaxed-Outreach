import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  FileText,
  Gauge,
  Handshake,
  LayoutDashboard,
  Menu,
  Search,
  Send,
  Settings as SettingsIcon,
  Target as TargetIcon,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAnalyticsBundle, globalSearch } from "@/lib/data/analytics";
import { nameOf } from "@/lib/data/referenceData";
import { useNotifications, useMarkNotificationsRead } from "@/lib/data/notifications";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DateRangeSelect } from "./DateRangeSelect";
import { OutreachDialog } from "./OutreachDialog";
import { formatDateTime } from "@/lib/data/dates";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-outreach", label: "My Outreach", icon: Send },
  { to: "/outreach", label: "All Outreach", icon: Briefcase },
  { to: "/prospects", label: "Prospects", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: Gauge },
  { to: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { to: "/meetings", label: "Meetings", icon: CalendarDays },
  { to: "/proposals", label: "Proposals", icon: FileText },
  { to: "/deals", label: "Closed Deals", icon: Trophy },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/targets", label: "Targets", icon: TargetIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        CM
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold">CodeMaxed</p>
        <p className="text-xs text-muted-foreground">Outreach Hub</p>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { data: bundle } = useAnalyticsBundle();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => (bundle ? globalSearch(bundle, query, nameOf) : []),
    [bundle, query],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((r) => map.set(r.category, [...(map.get(r.category) ?? []), r]));
    return Array.from(map.entries());
  }, [results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search companies, contacts, outreach…</span>
        <span className="sm:hidden">Search</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search companies, contacts, email, phone, website…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matching records.</CommandEmpty>
          {grouped.map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.title} ${r.subtitle} ${r.id}`}
                  onSelect={() => {
                    setOpen(false);
                    setQuery("");
                    navigate({
                      to: "/prospects/$prospectId",
                      params: { prospectId: r.prospectId },
                    });
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function NotificationsMenu() {
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications(user?.id);
  const markRead = useMarkNotificationsRead();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          <Button variant="ghost" size="sm" onClick={() => markRead.mutate()}>
            Mark all read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border px-4 py-3 last:border-0",
                  !n.read && "bg-primary-soft/40",
                )}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserSwitcher() {
  const { data: current } = useCurrentUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {current.initials}
          </span>
          <span className="hidden text-sm font-medium sm:inline">{current.name}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <p className="text-sm font-medium">{current.name}</p>
          <p className="text-xs text-muted-foreground">{current.role}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button className="w-full" onClick={() => setOutreachOpen(true)}>
            <Send className="size-4" /> Add Outreach
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <NavList onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden md:block">
              <DateRangeSelect />
            </div>
            <Button
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setOutreachOpen(true)}
            >
              <Send className="size-4" /> Add Outreach
            </Button>
            <NotificationsMenu />
            <UserSwitcher />
          </div>
          <div className="w-full md:hidden">
            <DateRangeSelect />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
          {hydrated ? (
            children
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-9 w-64" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
              <Skeleton className="h-72" />
            </div>
          )}
        </main>
      </div>

      <OutreachDialog open={outreachOpen} onOpenChange={setOutreachOpen} />
      <Handshake className="hidden" aria-hidden />
    </div>
  );
}
