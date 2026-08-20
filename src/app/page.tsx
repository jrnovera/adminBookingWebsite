"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import StatusBadge from "@/components/StatusBadge";
import HomeBadge from "@/components/HomeBadge";
import {
  IconBox,
  IconCalendar,
  IconClock,
  IconPlus,
  IconRegister,
  IconScissors,
  IconSettings,
  IconTag,
  IconUsers,
} from "@/components/Icons";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { deriveClients } from "@/lib/bookings";
import { addDays, formatDateLong, formatMoney, toDateKey } from "@/lib/format";
import { useBookings } from "@/lib/useBookings";
import { useAuth } from "@/lib/auth";
import { usePageVisibility } from "@/lib/pageVisibility";
import type { UserRole } from "@/lib/roles";

const CHART_COLOR = "#ffffff";

type Shortcut = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
  restrictedFrom?: UserRole[];
  superadminOnly?: boolean;
};

const shortcuts: Shortcut[] = [
  { href: "/calendar", label: "New Appointment", icon: IconPlus },
  { href: "/pos", label: "Point of Sale", icon: IconRegister },
  { href: "/clients", label: "Clients", icon: IconUsers },
  { href: "/inventory", label: "Inventory", icon: IconBox },
  { href: "/promos", label: "Promos", icon: IconTag },
  {
    href: "/staff",
    label: "Team",
    icon: IconScissors,
    restrictedFrom: ["staff"],
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: IconUsers,
    superadminOnly: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: IconSettings,
    restrictedFrom: ["staff"],
  },
];

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { bookings, loading, error } = useBookings();
  const { session, role, isSuperAdmin, isDeveloper } = useAuth();
  const { visibility } = usePageVisibility();
  const today = toDateKey(new Date());
  const firstName = session?.user.email?.split("@")[0] ?? "there";

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== "cancelled");
    const todays = active.filter((b) => b.booking_date === today);
    const pending = active.filter((b) => b.status === "pending").length;
    const clients = deriveClients(bookings);
    const newClients = clients.filter((c) => c.visits === 1).length;

    return {
      todayCount: todays.length,
      todaySales: todays.reduce((sum, b) => sum + Number(b.total), 0),
      pending,
      newClients,
      returningClients: clients.length - newClients,
      currency: bookings[0]?.currency ?? "AED",
    };
  }, [bookings, today]);

  // Last 7 days including today — a quick-glance trend inside the banner
  // itself, not a full report (Reports already owns that job).
  const weekTrend = useMemo(() => {
    const start = addDays(new Date(), -6);
    const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
    const byDay = new Map<string, number>(days.map((d) => [d, 0]));
    for (const b of bookings) {
      if (b.status === "cancelled" || !byDay.has(b.booking_date)) continue;
      byDay.set(b.booking_date, (byDay.get(b.booking_date) ?? 0) + Number(b.total));
    }
    return days.map((d) => ({
      label: new Date(d).toLocaleDateString("en-US", { weekday: "short" }),
      revenue: byDay.get(d) ?? 0,
    }));
  }, [bookings]);
  const weekTotal = weekTrend.reduce((sum, d) => sum + d.revenue, 0);

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date >= today && b.status !== "cancelled")
        .slice(0, 6),
    [bookings, today]
  );

  const visibleShortcuts = shortcuts.filter((s) => {
    // Same rule as the sidebar (see navConfig.tsx's isVisible) — the
    // developer's page_visibility toggles override restrictedFrom here too,
    // so a page hidden from the sidebar doesn't still show a shortcut card.
    if (isDeveloper) return true;
    if (s.superadminOnly && !isSuperAdmin) return false;
    const dynamic = visibility[s.href];
    const hiddenFromStaff = dynamic
      ? dynamic.hiddenFromStaff
      : Boolean(s.restrictedFrom?.includes("staff"));
    const hiddenFromAdminTier = dynamic ? dynamic.hiddenFromAdmin : false;
    if (role === "staff" && hiddenFromStaff) return false;
    if (role && role !== "staff" && hiddenFromAdminTier) return false;
    return true;
  });

  return (
    <>
      {/* Hero banner — a plain PageHeader here was just a title and a date;
          this is the one screen every shift starts on, so it's worth the
          extra weight of color, a real greeting, and the week's shape at a
          glance instead of making that a second stop on Reports. */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#565b43] via-[#6d7356] to-[#8a9070] px-4 py-6 sm:px-6 sm:py-8">
        <span
          aria-hidden="true"
          className="animate-drift pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="animate-drift pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-white/[0.07] blur-3xl [animation-delay:3s]"
        />

        <div className="animate-rise-in relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/70">
              {formatDateLong(today)}
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-white sm:text-3xl">
              {greeting(new Date().getHours())}
              {firstName !== "there" ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              {loading
                ? "Loading today's numbers…"
                : stats.todayCount > 0
                ? `${stats.todayCount} appointment${stats.todayCount === 1 ? "" : "s"} today · ${formatMoney(stats.todaySales, stats.currency)} so far`
                : "Nothing on the books yet today."}
            </p>
          </div>

          {/* 7-day glance chart — white-on-gradient, so it reads as part of
              the banner rather than a separate report bolted onto it. */}
          {!loading && weekTrend.some((d) => d.revenue > 0) && (
            <div className="w-full max-w-[220px] shrink-0 sm:w-56">
              <p className="text-right text-xs font-medium text-white/70">
                Last 7 days · {formatMoney(weekTotal, stats.currency)}
              </p>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekTrend} margin={{ top: 4, left: 0, right: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bannerFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: "none",
                        padding: "4px 8px",
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(value) => [
                        formatMoney(Number(value), stats.currency),
                        "",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLOR}
                      strokeWidth={2}
                      fill="url(#bannerFill)"
                      isAnimationActive
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {error && <ErrorBanner message={error} />}

        {/* Two-up on phones: full-width stat cards pushed the appointment
            list ~800px down the page before anything useful was visible.
            Each card links somewhere useful — a stat you can't act on is
            just decoration. Staggered rise-in on load, cheap because it's
            just an animation-delay per card, not sequenced JS. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            href="/appointments"
            label="Today's Appointments"
            value={String(stats.todayCount)}
            icon={<IconCalendar size={17} />}
            loading={loading}
            delay={0}
          />
          <StatCard
            href="/transactions"
            label="Today's Sales"
            value={formatMoney(stats.todaySales, stats.currency)}
            icon={<IconClock size={17} />}
            loading={loading}
            tone="primary"
            delay={60}
          />
          <StatCard
            href="/appointments"
            label="Pending"
            value={String(stats.pending)}
            icon={<IconClock size={17} />}
            loading={loading}
            tone={stats.pending > 0 ? "warning" : "default"}
            delay={120}
          />
          <StatCard
            href="/clients"
            label="New Clients"
            value={String(stats.newClients)}
            icon={<IconUsers size={17} />}
            loading={loading}
            delay={180}
          />
        </div>

        {/* Quick actions — curated per role, same restrictions as the nav
            rail (see navConfig.tsx), so a staff account never sees a
            shortcut to a page it would immediately get redirected away from. */}
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold">Quick actions</h2>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {visibleShortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="card-interactive hover:card-interactive-hover flex flex-col items-center gap-2 px-2 py-3.5 text-center"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-100 text-primary-dark">
                  <shortcut.icon size={16} />
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {shortcut.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold">Upcoming Appointments</h2>
            <Link
              href="/appointments"
              className="text-xs font-medium text-primary-dark hover:underline"
            >
              View all
            </Link>
          </div>

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
            // Bounded height: 6 rows is a glance, not the whole schedule —
            // "View all" above goes to Appointments for the rest, so this
            // list no longer grows to dominate the page on a busy day.
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
              {upcoming.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href="/appointments"
                    className="row-hover flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-background"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {booking.full_name}
                        <HomeBadge location={booking.service_location} />
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
                  </Link>
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
  href,
  label,
  value,
  icon,
  loading,
  tone = "default",
  delay = 0,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  tone?: "default" | "primary" | "warning";
  delay?: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delay}ms` }}
      className="card-interactive hover:card-interactive-hover animate-rise-in block px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] font-medium uppercase tracking-wide text-muted sm:text-xs">
          {label}
        </p>
        <span
          // Decorative only — hidden on phones so the label gets the full
          // card width instead of wrapping onto a third line.
          className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg sm:grid ${
            tone === "primary"
              ? "bg-primary-100 text-primary-dark"
              : tone === "warning"
              ? "bg-amber-100 text-amber-800"
              : "bg-foreground/[0.06] text-foreground/70"
          }`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="skeleton mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">
          {value}
        </p>
      )}
    </Link>
  );
}
