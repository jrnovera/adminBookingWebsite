"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, TableSkeleton } from "@/components/Feedback";
import {
  IconActivity,
  IconBan,
  IconCheck,
  IconClose,
  IconPencil,
  IconPlus,
  IconRegister,
} from "@/components/Icons";
import {
  fetchActivity,
  isActivityTableMissing,
  relativeTime,
  type Activity,
} from "@/lib/activity";

const filters = [
  { value: "all", label: "All" },
  { value: "booking", label: "Bookings" },
  { value: "block", label: "Blocked time" },
  { value: "staff", label: "Team" },
  { value: "product", label: "Inventory" },
  { value: "promo", label: "Promos" },
  { value: "service", label: "Services" },
  { value: "settings", label: "Settings" },
] as const;

/** Icon + tint per action, so the timeline is scannable at a glance. */
function visualFor(action: string) {
  if (action.includes("cancel") || action.includes("delete")) {
    return {
      icon: <IconClose size={14} />,
      tint: "bg-rose-100 text-rose-700",
    };
  }
  if (action.includes("paid") || action.includes("checkout")) {
    return {
      icon: <IconRegister size={14} />,
      tint: "bg-emerald-100 text-emerald-700",
    };
  }
  if (action.includes("confirm") || action.includes("complete")) {
    return {
      icon: <IconCheck size={14} />,
      tint: "bg-emerald-100 text-emerald-700",
    };
  }
  if (action.includes("block")) {
    return {
      icon: <IconBan size={14} />,
      tint: "bg-amber-100 text-amber-800",
    };
  }
  if (action.includes("create") || action.includes("add")) {
    return {
      icon: <IconPlus size={14} />,
      tint: "bg-sky-100 text-sky-700",
    };
  }
  return {
    icon: <IconPencil size={14} />,
    tint: "bg-foreground/[0.07] text-foreground/70",
  };
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(() => {
    fetchActivity(200).then((rows) => {
      setEntries(rows);
      setNeedsMigration(isActivityTableMissing());
      setLoading(false);
    });
  }, []);

  useEffect(load, [load]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? entries
        : entries.filter((entry) => entry.entity === filter),
    [entries, filter]
  );

  // Group into day buckets, preserving the newest-first ordering.
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: Activity[] }> = [];
    for (const entry of visible) {
      const label = dayLabel(entry.created_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(entry);
      else groups.push({ label, items: [entry] });
    }
    return groups;
  }, [visible]);

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle={`${visible.length} recent change${
          visible.length === 1 ? "" : "s"
        }`}
        action={
          <div className="flex gap-1.5">
            {filters.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  filter === option.value
                    ? "bg-foreground text-white shadow-sm"
                    : "border border-line text-foreground/70 hover:bg-background"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {needsMigration && (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            History is being kept in this browser only. Run{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
              supabase/009_activity_log.sql
            </code>{" "}
            to share it across devices and keep it permanently.
          </p>
        )}

        <div className="overflow-hidden card">
          {loading ? (
            <TableSkeleton rows={6} cols={3} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconActivity size={22} />}
              title="No activity yet"
              detail="Changes to bookings, staff and stock will appear here."
            />
          ) : (
            <div>
              {grouped.map((group) => (
                <section key={group.label}>
                  <p className="sticky top-0 z-10 border-y border-line bg-surface-2/95 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-line">
                    {group.items.map((entry) => {
                      const visual = visualFor(entry.action);
                      return (
                        <li
                          key={entry.id}
                          className="row-hover flex gap-3.5 px-5 py-3.5 hover:bg-background"
                        >
                          <span
                            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${visual.tint}`}
                          >
                            {visual.icon}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {entry.summary}
                            </p>
                            {entry.detail && (
                              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                {entry.detail}
                              </p>
                            )}
                            {entry.actor && (
                              <p className="mt-1 text-[11px] text-muted">
                                by {entry.actor}
                              </p>
                            )}
                          </div>

                          <time
                            dateTime={entry.created_at}
                            title={new Date(entry.created_at).toLocaleString()}
                            className="shrink-0 whitespace-nowrap text-xs text-muted"
                          >
                            {relativeTime(entry.created_at)}
                          </time>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
