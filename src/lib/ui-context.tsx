import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { buildRange, type DateRange, type RangeKey } from "./data/dates";

interface AppUIValue {
  rangeKey: RangeKey;
  customFrom: string;
  customTo: string;
  range: DateRange;
  setRangeKey: (key: RangeKey) => void;
  setCustom: (from: string, to: string) => void;
}

const AppUIContext = createContext<AppUIValue | null>(null);

export function AppUIProvider({ children }: { children: ReactNode }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const value = useMemo<AppUIValue>(
    () => ({
      rangeKey,
      customFrom,
      customTo,
      range: buildRange(rangeKey, { from: customFrom, to: customTo }),
      setRangeKey,
      setCustom: (from: string, to: string) => {
        setCustomFrom(from);
        setCustomTo(to);
        setRangeKey("custom");
      },
    }),
    [rangeKey, customFrom, customTo],
  );

  return <AppUIContext.Provider value={value}>{children}</AppUIContext.Provider>;
}

export function useAppUI() {
  const ctx = useContext(AppUIContext);
  if (!ctx) throw new Error("useAppUI must be used inside AppUIProvider");
  return ctx;
}
