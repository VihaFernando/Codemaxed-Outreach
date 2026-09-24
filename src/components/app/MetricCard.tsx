import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClass = {
    default: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="numeric mt-2 text-2xl font-semibold">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneClass)}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function TargetCard({
  label,
  actual,
  target,
  compact = false,
}: {
  label: string;
  actual: number;
  target: number;
  compact?: boolean;
}) {
  const progress = target > 0 ? Math.round((actual / target) * 100) : 0;
  const remaining = Math.max(0, target - actual);
  const tone =
    progress >= 100
      ? "text-success"
      : progress >= 60
        ? "text-foreground"
        : "text-warning-foreground";

  return (
    <div className={cn("surface-card", compact ? "p-3" : "p-4")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className={cn("numeric text-sm font-semibold", tone)}>{progress}%</p>
      </div>
      <p className="numeric mt-1 text-xl font-semibold">
        {actual}
        <span className="text-sm font-normal text-muted-foreground"> / {target}</span>
      </p>
      <Progress value={Math.min(progress, 100)} className="mt-3 h-1.5" />
      {!compact ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining} remaining` : "Target reached"}
        </p>
      ) : null}
    </div>
  );
}
