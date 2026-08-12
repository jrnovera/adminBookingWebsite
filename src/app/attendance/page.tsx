"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import AttendanceMarkModal from "@/components/AttendanceMarkModal";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { IconChevronLeft, IconChevronRight, IconClipboardCheck } from "@/components/Icons";
import {
  addMonths,
  daysInMonth,
  monthLabel,
  toDateKey,
  toMonthKey,
} from "@/lib/format";
import { attendanceStatusLabels, fetchAttendanceForMonth } from "@/lib/attendance";
import { fetchStaff } from "@/lib/staff";
import { useRequireRole } from "@/lib/useRequireRole";
import type { AttendanceStatus, Staff, StaffAttendance } from "@/lib/types";

const statusInitials: Record<AttendanceStatus, string> = {
  present: "P",
  late: "L",
  half_day: "½",
  on_leave: "O",
  absent: "A",
};

const statusDot: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800",
  late: "bg-amber-100 text-amber-800",
  half_day: "bg-primary-100 text-primary-dark",
  on_leave: "bg-foreground/10 text-muted",
  absent: "bg-rose-100 text-rose-700",
};

const weekdayInitial = ["S", "M", "T", "W", "T", "F", "S"];

export default function AttendancePage() {
  useRequireRole({ blockStaff: true });
  const [monthKey, setMonthKey] = useState(() => toMonthKey(new Date()));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ staff: Staff; dateKey: string } | null>(
    null
  );

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchAttendanceForMonth(monthKey)]).then(
      ([staffRows, attendanceRows]) => {
        setStaff(staffRows.filter((s) => s.active));
        setAttendance(attendanceRows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load attendance");
        setLoading(false);
      }
    );
  }, [monthKey]);

  useEffect(load, [load]);

  const byStaffDate = useMemo(() => {
    const map = new Map<string, StaffAttendance>();
    for (const row of attendance) {
      map.set(`${row.staff_id}__${row.attendance_date}`, row);
    }
    return map;
  }, [attendance]);

  const today = toDateKey(new Date());
  const dayCount = daysInMonth(monthKey);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const summaryByStaff = useMemo(() => {
    const map = new Map<string, Record<AttendanceStatus, number>>();
    for (const member of staff) {
      map.set(member.id, {
        present: 0,
        late: 0,
        half_day: 0,
        on_leave: 0,
        absent: 0,
      });
    }
    for (const row of attendance) {
      const counts = map.get(row.staff_id);
      if (counts) counts[row.status] += 1;
    }
    return map;
  }, [attendance, staff]);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Mark daily attendance — feeds straight into Payroll."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5 shadow-[var(--shadow-xs)]">
              <button
                onClick={() => setMonthKey((key) => addMonths(key, -1))}
                aria-label="Previous month"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="min-w-[9rem] px-2 text-center text-sm font-medium">
                {monthLabel(monthKey)}
              </span>
              <button
                onClick={() => setMonthKey((key) => addMonths(key, 1))}
                aria-label="Next month"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setMonthKey(toMonthKey(new Date()))}
              className="btn-ghost px-3 py-2 text-sm hover:bg-background"
            >
              This month
            </button>
            <Link
              href="/payroll"
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm hover:btn-primary-hover"
            >
              Go to Payroll
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        {error && <ErrorBanner message={error} />}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map(
            (status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${statusDot[status]}`}
                >
                  {statusInitials[status]}
                </span>
                {attendanceStatusLabels[status]}
              </span>
            )
          )}
          <span className="text-muted/70">· Click any day to mark it</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : staff.length === 0 ? (
          <EmptyState
            icon={<IconClipboardCheck size={22} />}
            title="No active staff"
            detail="Add team members on the Team page first."
          />
        ) : (
          <div className="card overflow-auto">
            <table className="border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-surface text-xs text-muted shadow-[inset_0_-1px_0_var(--color-line)]">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[180px] border-b border-r border-line bg-surface px-4 py-2.5 font-medium">
                    Staff
                  </th>
                  {days.map((day) => {
                    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
                    const weekday = new Date(dateKey).getDay();
                    return (
                      <th
                        key={day}
                        className={`w-9 min-w-9 border-b border-r border-line px-1 py-2.5 text-center font-medium ${
                          dateKey === today ? "bg-primary-50" : ""
                        }`}
                      >
                        <span className="block">{day}</span>
                        <span className="block text-[9px] normal-case text-muted/70">
                          {weekdayInitial[weekday]}
                        </span>
                      </th>
                    );
                  })}
                  <th className="min-w-[220px] border-b border-line px-4 py-2.5 font-medium">
                    Summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const counts = summaryByStaff.get(member.id);
                  return (
                    <tr key={member.id} className="border-b border-line">
                      <td className="sticky left-0 z-10 border-r border-line bg-surface px-4 py-2">
                        <span className="flex items-center gap-2">
                          <Avatar name={member.name} src={member.avatar_url} size={26} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {member.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {member.role}
                            </span>
                          </span>
                        </span>
                      </td>
                      {days.map((day) => {
                        const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
                        const row = byStaffDate.get(`${member.id}__${dateKey}`);
                        const isFuture = dateKey > today;
                        const isDayOff = member.days_off.includes(
                          new Date(dateKey).getDay()
                        );
                        return (
                          <td
                            key={day}
                            className={`border-r border-line p-1 text-center ${
                              dateKey === today ? "bg-primary-50/40" : ""
                            }`}
                          >
                            <button
                              onClick={() =>
                                setEditing({ staff: member, dateKey })
                              }
                              disabled={isFuture}
                              className={`grid h-7 w-7 place-items-center rounded-md text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                row
                                  ? statusDot[row.status]
                                  : isDayOff
                                  ? "bg-foreground/[0.04] text-muted/40"
                                  : "text-muted/40 hover:bg-background"
                              }`}
                              title={
                                row
                                  ? attendanceStatusLabels[row.status]
                                  : isDayOff
                                  ? "Scheduled day off"
                                  : "Unmarked"
                              }
                            >
                              {row ? statusInitials[row.status] : isDayOff ? "·" : ""}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-xs">
                        {counts && (
                          <span className="flex flex-wrap gap-2 text-muted">
                            <span className="text-emerald-700">
                              {counts.present}P
                            </span>
                            <span className="text-amber-700">{counts.late}L</span>
                            <span className="text-primary-dark">
                              {counts.half_day}½
                            </span>
                            <span>{counts.on_leave}O</span>
                            <span className="text-rose-700">{counts.absent}A</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editing && (
        <AttendanceMarkModal
          staff={editing.staff}
          dateKey={editing.dateKey}
          existing={
            byStaffDate.get(`${editing.staff.id}__${editing.dateKey}`) ?? null
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}
