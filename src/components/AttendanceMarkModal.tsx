"use client";

import { useState } from "react";
import Modal from "./Modal";
import { attendanceStatusLabels, deleteAttendance, markAttendance } from "@/lib/attendance";
import { formatDateLong } from "@/lib/format";
import type { AttendanceStatus, Staff, StaffAttendance } from "@/lib/types";

const statuses: AttendanceStatus[] = [
  "present",
  "late",
  "half_day",
  "on_leave",
  "absent",
];

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-800 border-emerald-200",
  late: "bg-amber-100 text-amber-800 border-amber-200",
  half_day: "bg-primary-100 text-primary-dark border-primary-200",
  on_leave: "bg-foreground/10 text-muted border-line",
  absent: "bg-rose-100 text-rose-700 border-rose-200",
};

const needsTimes = (status: AttendanceStatus) =>
  status === "present" || status === "late" || status === "half_day";

export default function AttendanceMarkModal({
  staff,
  dateKey,
  existing,
  onClose,
  onSaved,
}: {
  staff: Staff;
  dateKey: string;
  existing: StaffAttendance | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(
    existing?.status ?? "present"
  );
  const [timeIn, setTimeIn] = useState(existing?.time_in ?? staff.work_start);
  const [timeOut, setTimeOut] = useState(existing?.time_out ?? staff.work_end);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await markAttendance({
        staff_id: staff.id,
        attendance_date: dateKey,
        status,
        time_in: needsTimes(status) ? timeIn || null : null,
        time_out: needsTimes(status) ? timeOut || null : null,
        notes: notes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!existing) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAttendance(existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear");
      setBusy(false);
    }
  }

  return (
    <Modal title={staff.name} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-muted">{formatDateLong(dateKey)}</p>

        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted">
            Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  status === option
                    ? statusStyles[option]
                    : "border-line text-muted hover:bg-background"
                }`}
              >
                {attendanceStatusLabels[option]}
              </button>
            ))}
          </div>
        </div>

        {needsTimes(status) && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
                Time in
              </span>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
                Time out
              </span>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </label>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Notes (optional)
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. reason for leave"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {existing && (
            <button
              onClick={handleClear}
              disabled={busy}
              className="btn-ghost px-4 py-2.5 text-sm text-rose-700 hover:bg-rose-50"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-ghost px-4 py-2.5 text-sm hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
