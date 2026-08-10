"use client";

import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { IconCalendar, IconClock, IconUsers } from "@/components/Icons";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
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
      <PageHeader title="Dashboard" subtitle={formatDateLong(today)} />

      <main className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Today's Appointments"
            value={String(stats.todayCount)}
            icon={<IconCalendar size={17} />}
            loading={loading}
          />
          <StatCard
            label="Today's Sales"
            value={formatMoney(stats.todaySales, stats.currency)}
            icon={<IconClock size={17} />}
            loading={loading}
            tone="primary"
          />
          <StatCard
            label="New Clients"
            value={String(stats.newClients)}
            icon={<IconUsers size={17} />}
            loading={loading}
          />
          <StatCard
            label="Returning Clients"
            value={String(stats.returningClients)}
            icon={<IconUsers size={17} />}
            loading={loading}
          />
        </div>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3.5 text-sm font-semibold">
            Upcoming Appointments
          </h2>

          {loading ? (
            <div className="divide-y divide-line">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 px-5 py-4">
                  <div className="skeleton h-4 w-32 flex-1" />
                  <div className="skeleton h-4 w-16" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<IconCalendar size={22} />}
              title="No upcoming appointments"
              detail="New bookings from the site will show up here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((booking) => (
                <li
                  key={booking.id}
                  className="row-hover flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-background"
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
                      <p className="tabular-nums">{booking.booking_time}</p>
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

function StatCard({
  label,
  value,
  icon,
  loading,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  tone?: "default" | "primary";
}) {
  return (
    <div className="card-interactive hover:card-interactive-hover px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            tone === "primary"
              ? "bg-primary-100 text-primary-dark"
              : "bg-foreground/[0.06] text-foreground/70"
          }`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="skeleton mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}
