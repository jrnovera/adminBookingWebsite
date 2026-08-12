"use client";

import { useEffect, useState } from "react";
import { fetchCatalogServices } from "./serviceCatalog";

/**
 * The flat shape the quick-pick service dropdowns use (POS checkout, booking
 * drawer). Deliberately narrower than the full `Service` row — these pickers
 * only need something to label and price.
 */
export type ServiceOption = {
  id: string;
  name: string;
  duration: number;
  price: number;
};

/**
 * Live service options from the real catalogue that Services & Packages
 * manages.
 *
 * This used to be a hardcoded array of six invented treatments, which meant a
 * booking made from the admin app carried a service id and price that existed
 * nowhere else — the calendar, the booking site and the reports all disagreed
 * about what had been sold. Reading the real table keeps every surface in
 * step.
 *
 * Returns `[]` while loading or if the fetch fails; callers already handle an
 * empty dropdown, and a stale fake menu is worse than an empty one.
 */
export function useServiceOptions(): ServiceOption[] {
  const [options, setOptions] = useState<ServiceOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogServices().then(
      (rows) => {
        if (cancelled) return;
        setOptions(
          rows
            .filter((row) => row.active)
            .map((row) => ({
              id: row.id,
              name: row.name,
              duration: row.duration_minutes,
              price: Number(row.price),
            }))
        );
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}
