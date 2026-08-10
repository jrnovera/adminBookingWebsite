"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import StaffForm from "@/components/StaffForm";
import TimeOffPanel from "@/components/TimeOffPanel";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { IconPlus, IconScissors } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  deleteStaff,
  fetchStaff,
  fetchTimeOff,
  weekdayLabels,
} from "@/lib/staff";
import type { Staff, StaffTimeOff } from "@/lib/types";

export default function StaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [timeOff, setTimeOff] = useState<StaffTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [managingTimeOff, setManagingTimeOff] = useState<Staff | null>(null);
  const [removing, setRemoving] = useState<Staff | null>(null);

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

  async function handleDelete() {
    if (!removing) return;
    try {
      await deleteStaff(removing.id);
      toast.success("Staff removed", `${removing.name} was removed from the team.`);
      setRemoving(null);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      toast.error("Delete failed", message);
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
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm hover:btn-primary-hover"
          >
            <IconPlus size={15} />
            Add Staff
          </button>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="card space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-11 w-11 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="skeleton h-4 w-28" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="card border-dashed">
            <EmptyState
              icon={<IconScissors size={22} />}
              title="No staff yet"
              detail="Add your first team member to start scheduling."
            />
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
                  className="card-interactive hover:card-interactive-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} src={member.avatar_url} size={44} />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted">{member.role}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                      onClick={() => setRemoving(member)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 transition hover:bg-rose-50"
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
            const wasNew = editing === "new";
            setEditing(null);
            load();
            toast.success(wasNew ? "Staff member added" : "Staff member updated");
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
          onChanged={() => {
            load();
            toast.success("Time off updated");
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove staff member?"
          message={
            <>
              <span className="font-medium text-foreground">
                {removing.name}
              </span>{" "}
              will be removed from your team and unassigned from the calendar.
            </>
          }
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={handleDelete}
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
