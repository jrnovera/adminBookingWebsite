"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import PeriodFilter from "@/components/PeriodFilter";
import { ErrorBanner } from "@/components/Feedback";
import { IconCalendar, IconRegister } from "@/components/Icons";
import { formatMoney, parseTimeToMinutes, toDateKey } from "@/lib/format";
import { periodLabels, resolvePeriod, withinPeriod, type PeriodKey } from "@/lib/dateRange";
import { useBookings } from "@/lib/useBookings";
import { useRequireRole } from "@/lib/useRequireRole";
import { exportTransactionsCsv } from "@/lib/exportCsv";
import type { BookingStatus } from "@/lib/types";

// Same family as --color-primary in globals.css, plus enough extra hues to
// tell five status slices apart without repeating a color.
const CHART_PRIMARY = "#6d7356";
const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#d4a94a",
  confirmed: "#6d7356",
  completed: "#3f6b5c",
  cancelled: "#b3564b",
  no_show: "#8a8f98",
};
const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export default function ReportsPage() {
  useRequireRole({ blockStaff: true });
  const { bookings, loading, error } = useBookings();
  // Opens on today's numbers rather than the whole shop's history — that's
  // the number an admin actually checks first thing, with the rest of the
  // history one tap away via the period filter.
  const [period, setPeriod] = useState<PeriodKey>("today");

  // Jump straight to one specific month or day instead of the canned
  // periods above — whichever was picked most recently wins, and picking
  // either clears the quick chips' effect on the numbers below.
  const [customMonth, setCustomMonth] = useState("");
  const [customDate, setCustomDate] = useState("");
  const hasCustom = Boolean(customMonth || customDate);

  function monthBounds(month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const start = new Date(year, monthNum - 1, 1);
    const end = new Date(year, monthNum, 0);
    return { start: toDateKey(start), end: toDateKey(end) };
  }

  const reportBounds = useMemo(() => {
    if (customDate) return { start: customDate, end: customDate };
    if (customMonth) return monthBounds(customMonth);
    return resolvePeriod(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDate, customMonth, period]);

  // Export range — independent of the report's own period filter above, so
  // an admin can view "This month" on screen while exporting a completely
  // different window, e.g. last quarter's ledger.
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const exportCount = useMemo(() => {
    if (!exportFrom && !exportTo) return 0;
    const bounds = {
      start: exportFrom || "0000-00-00",
      end: exportTo || "9999-99-99",
    };
    return bookings.filter(
      (b) => b.status !== "cancelled" && withinPeriod(b.booking_date, bounds)
    ).length;
  }, [bookings, exportFrom, exportTo]);

  function handleExport() {
    const bounds = {
      start: exportFrom || "0000-00-00",
      end: exportTo || "9999-99-99",
    };
    const scoped = bookings.filter(
      (b) => b.status !== "cancelled" && withinPeriod(b.booking_date, bounds)
    );
    exportTransactionsCsv(scoped);
  }

  const report = useMemo(() => {
    const bounds = reportBounds;
    const inPeriod = bookings.filter((b) => withinPeriod(b.booking_date, bounds));
    const paid = inPeriod.filter((b) => b.status !== "cancelled");
    const currency = paid[0]?.currency ?? inPeriod[0]?.currency ?? "AED";

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

    // "Today" is one calendar date, so bucketing by day would collapse the
    // whole chart into a single flat point — hour-of-day is what's actually
    // useful there (when today got busy), so it gets its own bucketing.
    // Otherwise: daily buckets while the range is short enough to read as a
    // line without turning into noise, monthly once it would otherwise be
    // hundreds of points (e.g. "All time" on a shop open a couple of years).
    const dateKeys = inPeriod.map((b) => b.booking_date).sort();
    const spanDays =
      dateKeys.length > 1
        ? (new Date(dateKeys[dateKeys.length - 1]).getTime() -
            new Date(dateKeys[0]).getTime()) /
          86_400_000
        : 0;
    const byHour = customDate ? true : !hasCustom && period === "today";
    const byMonth = !byHour && spanDays > 62;

    const bucketKey = (booking: (typeof paid)[number]) => {
      if (byHour) {
        const minutes = parseTimeToMinutes(booking.booking_time);
        // Unparseable time labels fall into their own bucket rather than
        // silently vanishing from the chart.
        return minutes === null ? "?" : String(Math.floor(minutes / 60));
      }
      return byMonth ? booking.booking_date.slice(0, 7) : booking.booking_date;
    };
    const bucketLabel = (key: string) => {
      if (byHour) {
        if (key === "?") return "—";
        const hour = Number(key);
        const period12 = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        return `${hour12} ${period12}`;
      }
      return byMonth
        ? new Date(`${key}-01`).toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          })
        : new Date(key).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
    };

    const trendMap = new Map<string, { revenue: number; bookings: number }>();
    for (const booking of paid) {
      const key = bucketKey(booking);
      const entry = trendMap.get(key) ?? { revenue: 0, bookings: 0 };
      entry.revenue += Number(booking.total);
      entry.bookings += 1;
      trendMap.set(key, entry);
    }
    const trend = [...trendMap.entries()]
      .sort((a, b) =>
        byHour ? Number(a[0] === "?" ? -1 : a[0]) - Number(b[0] === "?" ? -1 : b[0]) : a[0].localeCompare(b[0])
      )
      .map(([key, entry]) => ({ label: bucketLabel(key), ...entry }));

    const statusCounts = new Map<BookingStatus, number>();
    for (const booking of inPeriod) {
      statusCounts.set(booking.status, (statusCounts.get(booking.status) ?? 0) + 1);
    }
    const statusBreakdown = [...statusCounts.entries()]
      .map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status],
        count,
        color: STATUS_COLORS[status],
      }))
      .sort((a, b) => b.count - a.count);

    return {
      currency,
      totalRevenue: paid.reduce((sum, b) => sum + Number(b.total), 0),
      totalBookings: paid.length,
      avgTicket: paid.length
        ? paid.reduce((sum, b) => sum + Number(b.total), 0) / paid.length
        : 0,
      byService: tally("service_name"),
      byStaff: tally("staff_name"),
      trend,
      statusBreakdown,
    };
  }, [bookings, reportBounds, hasCustom, customDate, period]);

  const rangeLabel = customDate
    ? new Date(`${customDate}T00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : customMonth
      ? new Date(`${customMonth}-01T00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : period === "today"
        ? "Today's"
        : `${periodLabels[period]}`;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${rangeLabel} performance`}
      />

      <main className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="space-y-3 rounded-2xl border border-line bg-surface-2 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Quick periods</p>
            <PeriodFilter
              value={period}
              onChange={(next) => {
                setCustomMonth("");
                setCustomDate("");
                setPeriod(next);
              }}
            />
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Custom range</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="font-medium">Month:</span>
                <input
                  type="month"
                  value={customMonth}
                  onChange={(event) => {
                    setCustomDate("");
                    setCustomMonth(event.target.value);
                  }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none transition-all duration-200 focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06] hover:border-foreground/20"
                />
              </label>
              <span className="text-muted">or</span>
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="font-medium">Date:</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => {
                    setCustomMonth("");
                    setCustomDate(event.target.value);
                  }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none transition-all duration-200 focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06] hover:border-foreground/20"
                />
              </label>
              {hasCustom && (
                <button
                  onClick={() => {
                    setCustomMonth("");
                    setCustomDate("");
                  }}
                  className="ml-auto rounded-lg bg-background px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-background/80"
                >
                  Clear custom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Export ledger — pick a range on the calendar, independent of the
            report's own period filter above. */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
          <span className="flex shrink-0 items-center gap-1.5 pl-1 text-xs font-medium text-muted">
            <IconCalendar size={14} />
            Export range
          </span>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <span className="hidden sm:inline">From</span>
            <input
              type="date"
              value={exportFrom}
              onChange={(event) => setExportFrom(event.target.value)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <span className="hidden sm:inline">to</span>
            <input
              type="date"
              value={exportTo}
              onChange={(event) => setExportTo(event.target.value)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
            />
          </label>
          {(exportFrom || exportTo) && (
            <button
              onClick={() => {
                setExportFrom("");
                setExportTo("");
              }}
              className="text-xs text-primary hover:underline"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exportCount === 0}
            className="btn-primary ml-auto flex shrink-0 items-center gap-1.5 px-4 py-2 text-xs hover:btn-primary-hover disabled:opacity-50"
          >
            <IconRegister size={13} />
            <span>Export{exportCount > 0 ? ` (${exportCount})` : ""}</span>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat
            label="Total Revenue"
            value={formatMoney(report.totalRevenue, report.currency)}
            loading={loading}
          />
          <Stat
            label="Bookings"
            value={String(report.totalBookings)}
            loading={loading}
          />
          <Stat
            label="Average Ticket"
            value={formatMoney(report.avgTicket, report.currency)}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:gap-6">
          <section className="card">
            <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
              {period === "today" ? "Revenue by hour" : "Revenue over time"}
            </h2>
            {loading ? (
              <div className="skeleton m-5 h-56 rounded-xl" />
            ) : report.trend.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No data yet.</p>
            ) : (
              <div className="h-56 px-2 py-4 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.trend} margin={{ left: 8, right: 16 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={{ stroke: "var(--line)" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        boxShadow: "var(--shadow-md)",
                      }}
                      formatter={(value, name) =>
                        name === "revenue"
                          ? [formatMoney(Number(value), report.currency), "Revenue"]
                          : [String(value), "Bookings"]
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_PRIMARY}
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
              Bookings by status
            </h2>
            {loading ? (
              <div className="skeleton m-5 h-56 rounded-xl" />
            ) : report.statusBreakdown.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No data yet.</p>
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-4 sm:h-64 sm:flex-row">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {report.statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          boxShadow: "var(--shadow-md)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full min-w-0 space-y-1.5 text-sm">
                  {report.statusBreakdown.map((entry) => (
                    <li
                      key={entry.status}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate">{entry.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {entry.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
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

        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
            {period === "today" ? "Bookings by hour" : "Bookings over time"}
          </h2>
          {loading ? (
            <div className="skeleton m-5 h-48 rounded-xl" />
          ) : report.trend.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">No data yet.</p>
          ) : (
            <div className="h-48 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.trend} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      boxShadow: "var(--shadow-md)",
                    }}
                    formatter={(value) => [String(value), "Bookings"]}
                  />
                  <Bar dataKey="bookings" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="card-interactive hover:card-interactive-hover px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      {loading ? (
        <div className="skeleton mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
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
