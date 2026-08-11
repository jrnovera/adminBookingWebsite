import { periodLabels, periodOptions, type PeriodKey } from "@/lib/dateRange";

export default function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-line p-1">
      {periodOptions.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            value === option
              ? "bg-foreground text-surface"
              : "text-muted hover:bg-background"
          }`}
        >
          {periodLabels[option]}
        </button>
      ))}
    </div>
  );
}
