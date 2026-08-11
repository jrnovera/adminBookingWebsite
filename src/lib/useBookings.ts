"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { fetchBookings } from "./bookings";
import { getSupabaseClient } from "./supabase";
import type { Booking } from "./types";

export function useBookings() {
  // The Supabase client keys channels by topic, so two components using this
  // hook at once (a page plus the notification bell) would otherwise collide on
  // one already-subscribed channel and throw. One topic per hook instance.
  const channelId = useId();
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

  // Live updates: a booking made on the public site (or by another admin on
  // another device) shows up without anyone hitting refresh. Postgres changes
  // arrive over a websocket; we refetch rather than patch state in place so
  // ordering and any server-side defaults stay correct. Requires `bookings` to
  // be in the `supabase_realtime` publication — see supabase/015_realtime.sql.
  useEffect(() => {
    const supabase = getSupabaseClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`bookings-live${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          // A single admin action can fire several row events in a row
          // (status + payment, say) — coalesce them into one refetch.
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => setRefreshKey((key) => key + 1), 150);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return { bookings, loading, error, reload };
}
