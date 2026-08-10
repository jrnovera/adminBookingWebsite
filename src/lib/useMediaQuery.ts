"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query from React. Starts false so server and first
 * client render agree, then settles on mount.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * How many calendar days fit comfortably: one on a phone, three on a tablet,
 * the full week on a desktop.
 */
export function useVisibleDayCount() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 640px)");
  if (isDesktop) return 7;
  if (isTablet) return 3;
  return 1;
}
