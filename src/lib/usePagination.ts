import { useEffect, useMemo, useState } from "react";

/**
 * Slices an already-filtered/sorted array into pages. Resets to page 1
 * whenever the input list identity changes (a new search term, filter, or
 * reload) — otherwise a search that narrows to one page would leave you
 * stranded on page 4 looking at an empty table.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items]);

  // Clamp rather than reset if only the page count shrank (e.g. deleting the
  // last row on the last page) — stay as close to where the admin was.
  const clampedPage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  return {
    page: clampedPage,
    pageCount,
    pageItems,
    setPage,
    total: items.length,
  };
}
