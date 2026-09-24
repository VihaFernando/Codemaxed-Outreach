export interface DateRange {
  from: string; // inclusive ISO
  to: string; // exclusive ISO
  label: string;
  key: RangeKey;
}

export const RANGE_KEYS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_quarter",
  "all_time",
  "custom",
] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  all_time: "All Time",
  custom: "Custom Range",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Weeks start on Monday. */
export function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
}

export function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function buildRange(key: RangeKey, custom?: { from?: string; to?: string }): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  const mk = (from: Date, to: Date): DateRange => ({
    from: from.toISOString(),
    to: to.toISOString(),
    label: RANGE_LABELS[key],
    key,
  });

  switch (key) {
    case "today":
      return mk(today, addDays(today, 1));
    case "yesterday":
      return mk(addDays(today, -1), today);
    case "this_week":
      return mk(startOfWeek(today), addDays(startOfWeek(today), 7));
    case "last_week":
      return mk(addDays(startOfWeek(today), -7), startOfWeek(today));
    case "this_month":
      return mk(startOfMonth(today), addDays(startOfMonth(addDays(startOfMonth(today), 40)), 0));
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return mk(start, startOfMonth(today));
    }
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 1);
      return mk(start, end);
    }
    case "custom": {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : addDays(today, -30);
      const to = custom?.to ? addDays(startOfDay(new Date(custom.to)), 1) : addDays(today, 1);
      return mk(from, to);
    }
    case "all_time":
    default:
      return mk(new Date(2000, 0, 1), addDays(today, 3650));
  }
}

export function inRange(iso: string | null | undefined, range: DateRange) {
  if (!iso) return false;
  return iso >= range.from && iso < range.to;
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relativeDayLabel(iso?: string | null) {
  if (!iso) return "—";
  const d = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

export function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function toTimeInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

export function fromDateTimeInput(date: string, time?: string) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "09:00").split(":").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1, hh ?? 9, mm ?? 0).toISOString();
}

export function formatCurrency(value: number) {
  return `LKR ${Math.round(value).toLocaleString("en-US")}`;
}

export function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `LKR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `LKR ${Math.round(value / 1000)}K`;
  return `LKR ${value}`;
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
