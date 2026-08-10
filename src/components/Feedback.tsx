import { IconAlert } from "./Icons";

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground/[0.05] text-foreground/40">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <IconAlert size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Rows of skeleton bars for a table body while data loads. */
export function TableSkeleton({
  rows = 4,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((__, col) => (
            <div
              key={col}
              className="skeleton h-4 flex-1"
              style={{ maxWidth: col === 0 ? "9rem" : "6rem" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
