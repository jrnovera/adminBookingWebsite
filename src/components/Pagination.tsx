import { IconChevronLeft, IconChevronRight } from "./Icons";

export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm sm:px-5">
      <p className="text-xs text-muted sm:text-sm">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconChevronLeft size={15} />
        </button>
        <span className="px-2 text-xs tabular-nums text-muted sm:text-sm">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
