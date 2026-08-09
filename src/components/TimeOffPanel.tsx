"use client";

import { useState } from "react";
import Modal from "./Modal";
import { addTimeOff, deleteTimeOff } from "@/lib/staff";
import { formatDateLong, toDateKey } from "@/lib/format";
import type { Staff, StaffTimeOff } from "@/lib/types";

export default function TimeOffPanel({
  staff,
  entries,
  onClose,
  onChanged,
}: {
  staff: Staff;
  entries: StaffTimeOff[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const today = toDateKey(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await addTimeOff({
        staff_id: staff.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      });
      setReason("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add time off");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteTimeOff(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove entry");
    }
  }

  return (
    <Modal title={`Time off — ${staff.name}`} onClose={onClose}>
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              From
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              To
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Reason
          </span>
          <input
            value={reason}
            placeholder="Vacation, sick leave…"
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add time off"}
        </button>
      </form>

      <div className="mt-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">
          Scheduled
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No time off booked.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
              >
                <div>
                  <p>
                    {formatDateLong(entry.start_date)} –{" "}
                    {formatDateLong(entry.end_date)}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-muted">{entry.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-xs text-rose-700 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
