"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseClient } from "./supabase";

/** Keyed by the nav item's href (e.g. "/payroll") — see navConfig.tsx. */
export type PageVisibilityMap = Record<
  string,
  { hiddenFromStaff: boolean; hiddenFromAdmin: boolean }
>;

/**
 * A missing row (or a failed fetch) reads as visible everywhere — the
 * feature fails open, so a network hiccup can never make the whole nav
 * disappear for a shop owner mid-shift.
 */
async function fetchPageVisibility(): Promise<PageVisibilityMap> {
  const { data, error } = await getSupabaseClient()
    .from("page_visibility")
    .select("key, hidden_from_staff, hidden_from_admin");

  if (error) throw new Error(error.message);

  const map: PageVisibilityMap = {};
  for (const row of data ?? []) {
    map[row.key as string] = {
      hiddenFromStaff: Boolean(row.hidden_from_staff),
      hiddenFromAdmin: Boolean(row.hidden_from_admin),
    };
  }
  return map;
}

/**
 * Developer-only at the database level — the "Developers manage page
 * visibility" RLS policy rejects this from any other role, so the Settings
 * page hiding the controls from non-developers is a UI nicety, not the
 * actual guard.
 */
export async function savePageVisibility(
  key: string,
  patch: { hiddenFromStaff: boolean; hiddenFromAdmin: boolean }
) {
  const { error } = await getSupabaseClient()
    .from("page_visibility")
    .upsert(
      {
        key,
        hidden_from_staff: patch.hiddenFromStaff,
        hidden_from_admin: patch.hiddenFromAdmin,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) throw new Error(error.message);
}

type PageVisibilityValue = {
  visibility: PageVisibilityMap;
  /** False once the first fetch (success or failure) has settled. Nav
   * guards should keep using the static defaults, not flash items, while
   * this is true. */
  loading: boolean;
  reload: () => void;
};

const PageVisibilityContext = createContext<PageVisibilityValue>({
  visibility: {},
  loading: true,
  reload: () => {},
});

/** One shared fetch for the whole app — Sidebar, MobileNav and the Settings
 * page's own editor all read from this instead of each querying separately. */
export function PageVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visibility, setVisibility] = useState<PageVisibilityMap>({});
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPageVisibility().then(
      (map) => {
        if (!cancelled) {
          setVisibility(map);
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setKey((value) => value + 1), []);
  const value = useMemo(
    () => ({ visibility, loading, reload }),
    [visibility, loading, reload]
  );

  return (
    <PageVisibilityContext value={value}>{children}</PageVisibilityContext>
  );
}

export function usePageVisibility() {
  return useContext(PageVisibilityContext);
}
