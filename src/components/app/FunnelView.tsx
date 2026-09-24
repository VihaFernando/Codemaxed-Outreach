import type { FunnelStage } from "@/lib/data/analytics";

export function FunnelView({ stages }: { stages: FunnelStage[] }) {
  const chartHeight = 392;
  const chartWidth = 520;
  const center = chartWidth / 2;
  const rowHeight = chartHeight / stages.length;
  const maxShapeWidth = 500;
  const minimumShapeWidth = 3;
  const stageColors = [
    "fill-funnel-1",
    "fill-funnel-2",
    "fill-funnel-3",
    "fill-funnel-4",
    "fill-funnel-5",
    "fill-funnel-6",
    "fill-funnel-7",
  ];
  const widthFor = (percentage: number) =>
    Math.max(minimumShapeWidth, (Math.min(100, percentage) / 100) * maxShapeWidth);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[700px] grid-cols-[180px_minmax(320px,1fr)_130px] items-stretch gap-x-4">
        <div
          className="grid"
          style={{ gridTemplateRows: `repeat(${stages.length}, minmax(56px, 1fr))` }}
        >
          {stages.map((stage) => (
            <div
              key={stage.label}
              className="flex min-h-14 flex-col justify-center border-b border-border/70 pr-2 last:border-b-0"
            >
              <span className="text-sm font-medium text-foreground">{stage.label}</span>
              <span className="numeric mt-0.5 text-xs text-muted-foreground">
                {stage.count.toLocaleString()} {stage.count === 1 ? "prospect" : "prospects"}
              </span>
            </div>
          ))}
        </div>

        <div className="relative min-h-[392px]">
          <svg
            aria-label="Sales conversion funnel"
            className="absolute inset-0 size-full overflow-visible"
            preserveAspectRatio="none"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            {stages.map((stage, index) => {
              const topWidth = widthFor(stage.ofTargeted);
              const next = stages[index + 1];
              const bottomWidth = widthFor(next?.ofTargeted ?? stage.ofTargeted);
              const topY = index * rowHeight + 2;
              const bottomY = (index + 1) * rowHeight - 2;
              const points = [
                `${center - topWidth / 2},${topY}`,
                `${center + topWidth / 2},${topY}`,
                `${center + bottomWidth / 2},${bottomY}`,
                `${center - bottomWidth / 2},${bottomY}`,
              ].join(" ");
              return (
                <polygon
                  key={stage.label}
                  className={`${stageColors[index] ?? "fill-funnel-7"} transition-all duration-500`}
                  points={points}
                />
              );
            })}
          </svg>
        </div>

        <div
          className="grid"
          style={{ gridTemplateRows: `repeat(${stages.length}, minmax(56px, 1fr))` }}
        >
          {stages.map((stage, index) => (
            <div
              key={stage.label}
              className="flex min-h-14 flex-col justify-center border-b border-border/70 pl-2 last:border-b-0"
            >
              <span className="numeric text-lg font-semibold text-foreground">
                {stage.ofTargeted}%
              </span>
              <span className="numeric text-xs text-muted-foreground">
                {index === 0 ? "of targeted" : `${stage.conversionFromPrevious}% from previous`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
        Swipe to view the complete funnel
      </p>
    </div>
  );
}
