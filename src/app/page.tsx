"use client";

import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { deriveClients } from "@/lib/bookings";
import { formatDateLong, formatMoney, toDateKey } from "@/lib/format";
import { useBookings } from "@/lib/useBookings";

export default function DashboardPage() {
  const { bookings, loading, error } = useBookings();
  const today = toDateKey(new Date());

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    const todays = active.filter((b) => b.booking_date === today);
    const clients = deriveClients(bookings);
    const newClients = clients.filter((c) => c.visits === 1).length;

    return {
      todayCount: todays.length,
      todaySales: todays.reduce((sum, b) => sum + Number(b.total), 0),
      newClients,
      returningClients: clients.length - newClients,
      currency: bookings[0]?.currency ?? "AED",
    };
  }, [bookings, today]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date >= today && b.status !== "cancelled")
        .slice(0, 8),
    [bookings, today]
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={formatDateLong(today)}
      />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Today's Appointments" value={String(stats.todayCount)} />
          <StatCard
            label="Today's Sales"
            value={formatMoney(stats.todaySales, stats.currency)}
          />
          <StatCard label="New Clients" value={String(stats.newClients)} />
          <StatCard
            label="Returning Clients"
            value={String(stats.returningClients)}
          />
        </div>

        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
            Upcoming Appointments
          </h2>

          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No upcoming appointments yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {booking.full_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {booking.service_name} · {booking.staff_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-muted">
                      <p>{formatDateLong(booking.booking_date)}</p>
                      <p>{booking.booking_time}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
