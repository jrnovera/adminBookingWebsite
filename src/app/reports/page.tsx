"use client";

import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { formatMoney } from "@/lib/format";
import { useBookings } from "@/lib/useBookings";

export default function ReportsPage() {
  const { bookings, loading, error } = useBookings();

  const report = useMemo(() => {
    const paid = bookings.filter((b) => b.status !== "cancelled");
    const currency = paid[0]?.currency ?? "AED";

    const tally = (key: "service_name" | "staff_name") => {
      const map = new Map<string, { count: number; revenue: number }>();
      for (const booking of paid) {
        const entry = map.get(booking[key]) ?? { count: 0, revenue: 0 };
        entry.count += 1;
        entry.revenue += Number(booking.total);
        map.set(booking[key], entry);
      }
      return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    };

    return {
      currency,
      totalRevenue: paid.reduce((sum, b) => sum + Number(b.total), 0),
      totalBookings: paid.length,
      avgTicket: paid.length
        ? paid.reduce((sum, b) => sum + Number(b.total), 0) / paid.length
        : 0,
      byService: tally("service_name"),
      byStaff: tally("staff_name"),
    };
  }, [bookings]);

  return (
    <>
      <PageHeader title="Reports" subtitle="All-time performance" />

      <main className="flex-1 space-y-6 p-6">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        {loading && <p className="text-sm text-muted">Loading…</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Total Revenue"
            value={formatMoney(report.totalRevenue, report.currency)}
          />
          <Stat label="Bookings" value={String(report.totalBookings)} />
          <Stat
            label="Average Ticket"
            value={formatMoney(report.avgTicket, report.currency)}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Breakdown
            title="Top Services"
            rows={report.byService}
            currency={report.currency}
          />
          <Breakdown
            title="Staff Performance"
            rows={report.byStaff}
            currency={report.currency}
          />
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: Array<[string, { count: number; revenue: number }]>;
  currency: string;
}) {
  const max = rows[0]?.[1].revenue ?? 0;

  return (
    <section className="card">
      <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No data yet.</p>
      ) : (
        <ul className="space-y-3 px-5 py-4">
          {rows.map(([name, entry]) => (
            <li key={name}>
              <div className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted">
                  {entry.count} · {formatMoney(entry.revenue, currency)}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-background">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{
                    width: `${max ? (entry.revenue / max) * 100 : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
