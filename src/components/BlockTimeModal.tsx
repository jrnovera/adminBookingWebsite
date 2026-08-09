"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createBlock } from "@/lib/blocks";
import { formatMinutes } from "@/lib/format";
import type { Staff } from "@/lib/types";

const STEP = 15;
const timeOptions = Array.from(
  { length: (24 * 60) / STEP },
  (_, index) => index * STEP
);

export default function BlockTimeModal({
  staff,
  defaultStaffId,
  defaultDate,
  defaultMinutes,
  onClose,
  onCreated,
}: {
  staff: Staff[];
  defaultStaffId: string | null;
  defaultDate: string;
  defaultMinutes: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [staffId, setStaffId] = useState(defaultStaffId ?? staff[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [startMinutes, setStartMinutes] = useState(
    Math.round(defaultMinutes / STEP) * STEP
  );
  const [endMinutes, setEndMinutes] = useState(
    Math.round(defaultMinutes / STEP) * STEP + 60
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleStartChange(next: number) {
    setStartMinutes(next);
    // Keep the end after the start, preserving the current length.
    if (next >= endMinutes) {
      setEndMinutes(Math.min(next + 60, 24 * 60));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!staffId) {
      setError("Pick a staff member.");
      return;
    }
    if (endMinutes <= startMinutes) {
      setError("End time must be after start time.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createBlock({
        staff_id: staffId,
        block_date: date,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
        reason: reason.trim() || null,
      });
      onCreated();
    } catch (err) {
      // 23P01 = staff_blocks_no_overlap exclusion constraint.
      const message =
        err instanceof Error && err.message.includes("staff_blocks_no_overlap")
          ? "This staff member already has a block that overlaps this time."
          : err instanceof Error
          ? err.message
          : "Could not create block";
      setError(message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Block time" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Staff
          </span>
          <select
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
          >
            {staff.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.role}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Start
            </span>
            <select
              value={startMinutes}
              onChange={(event) => handleStartChange(Number(event.target.value))}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {timeOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatMinutes(minutes)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              End
            </span>
            <select
              value={endMinutes}
              onChange={(event) => setEndMinutes(Number(event.target.value))}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            >
              {timeOptions
                .filter((minutes) => minutes > startMinutes)
                .map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatMinutes(minutes)}
                  </option>
                ))}
              <option value={24 * 60}>12:00 AM</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Reason (optional)
          </span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Lunch break, personal appointment…"
            className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Blocking…" : "Block time"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-4 py-2.5 text-sm hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
