import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/data/dates";
import { useAppUI } from "@/lib/ui-context";

export function DateRangeSelect() {
  const { rangeKey, setRangeKey, customFrom, customTo, setCustom } = useAppUI();

  return (
    <div className="flex items-center gap-2">
      <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
        <SelectTrigger className="h-9 w-[150px]" aria-label="Date range">
          <CalendarRange className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {RANGE_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {rangeKey === "custom" ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              {customFrom || "Start"} → {customTo || "End"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">From</p>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustom(e.target.value, customTo)}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">To</p>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustom(customFrom, e.target.value)}
              />
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
