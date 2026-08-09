"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import StaffForm from "@/components/StaffForm";
import TimeOffPanel from "@/components/TimeOffPanel";
import {
  deleteStaff,
  fetchStaff,
  fetchTimeOff,
  weekdayLabels,
} from "@/lib/staff";
import type { Staff, StaffTimeOff } from "@/lib/types";

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [timeOff, setTimeOff] = useState<StaffTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [managingTimeOff, setManagingTimeOff] = useState<Staff | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchStaff(), fetchTimeOff()]).then(
      ([staffRows, timeOffRows]) => {
        setStaff(staffRows);
        setTimeOff(timeOffRows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load staff");
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  async function handleDelete(member: Staff) {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    try {
      await deleteStaff(member.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${staff.length} staff member${staff.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={() => setEditing("new")}
            className="btn-primary px-4 py-2 text-sm hover:opacity-90"
          >
            + Add Staff
          </button>
        }
      />

      <main className="flex-1 space-y-4 p-6">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : staff.length === 0 ? (
          <div className="card border-dashed p-10 text-center">
            <p className="text-sm text-muted">
              No staff yet. Add your first team member to start scheduling.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.map((member) => {
              const upcoming = timeOff.filter(
                (entry) => entry.staff_id === member.id
              );
              return (
                <article
                  key={member.id}
                  className="card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} src={member.avatar_url} size={44} />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        member.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-foreground/10 text-muted"
                      }`}
                    >
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-1.5 text-sm">
                    <Row label="Hours">
                      {member.work_start} – {member.work_end}
                    </Row>
                    <Row label="Days off">
                      {member.days_off.length
                        ? member.days_off
                            .map((day) => weekdayLabels[day])
                            .join(", ")
                        : "None"}
                    </Row>
                    <Row label="Time off">
                      {upcoming.length ? `${upcoming.length} booked` : "None"}
                    </Row>
                    {member.email && <Row label="Email">{member.email}</Row>}
                    {member.phone && <Row label="Phone">{member.phone}</Row>}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditing(member)}
                      className="btn-ghost px-3 py-1.5 text-xs hover:bg-background"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setManagingTimeOff(member)}
                      className="btn-ghost px-3 py-1.5 text-xs hover:bg-background"
                    >
                      Time off
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {editing && (
        <StaffForm
          staff={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {managingTimeOff && (
        <TimeOffPanel
          staff={managingTimeOff}
          entries={timeOff.filter(
            (entry) => entry.staff_id === managingTimeOff.id
          )}
          onClose={() => setManagingTimeOff(null)}
          onChanged={load}
        />
      )}
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
