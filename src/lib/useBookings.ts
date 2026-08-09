"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBookings } from "./bookings";
import type { Booking } from "./types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchBookings().then(
      (data) => {
        if (cancelled) return;
        setBookings(data);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load bookings");
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { bookings, loading, error, reload };
}
