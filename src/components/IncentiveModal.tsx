"use client";

import { useState } from "react";
import Modal from "./Modal";
import { addIncentive, deleteIncentive, incentiveKindLabels } from "@/lib/payroll";
import { formatMoney } from "@/lib/format";
import type { IncentiveKind, Staff, StaffIncentive } from "@/lib/types";

const kinds: IncentiveKind[] = ["bonus", "commission", "deduction"];

const kindStyles: Record<IncentiveKind, string> = {
  bonus: "bg-emerald-100 text-emerald-800 border-emerald-200",
  commission: "bg-primary-100 text-primary-dark border-primary-200",
  deduction: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function IncentiveModal({
  staff,
  monthKey,
  currency,
  existing,
  onClose,
  onChanged,
}: {
  staff: Staff;
  monthKey: string;
  currency: string;
  /** Existing line items for this staff member + month, so the admin can
   * see and remove them without hunting through a separate list. */
  existing: StaffIncentive[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<IncentiveKind>("bonus");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!label.trim() || !amount || Number(amount) <= 0) {
      setError("Enter a label and an amount greater than 0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addIncentive({
        staff_id: staff.id,
        period_month: `${monthKey}-01`,
        label: label.trim(),
        amount: Number(amount),
        kind,
        notes: notes.trim() || null,
      });
      setLabel("");
      setAmount("");
      setNotes("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteIncentive(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${staff.name} — bonuses & deductions`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        {existing.length > 0 && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {existing.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${kindStyles[item.kind]}`}
                    >
                      {incentiveKindLabels[item.kind]}
                    </span>
                    <span className="truncate font-medium">{item.label}</span>
                  </p>
                  {item.notes && (
                    <p className="truncate text-xs text-muted">{item.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">
                    {item.kind === "deduction" ? "−" : "+"}
                    {formatMoney(item.amount, currency)}
                  </span>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={busy}
                    className="text-xs text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-xl border border-line p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Add line item
          </p>
          <div className="flex gap-1.5">
            {kinds.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  kind === option
                    ? kindStyles[option]
                    : "border-line text-muted hover:bg-background"
                }`}
              >
                {incentiveKindLabels[option]}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Label
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                kind === "bonus"
                  ? "e.g. Perfect attendance bonus"
                  : kind === "commission"
                  ? "e.g. Retail sales commission"
                  : "e.g. Uniform advance"
              }
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Amount ({currency})
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Notes (optional)
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Adding…" : `Add ${incentiveKindLabels[kind].toLowerCase()}`}
          </button>
        </div>

        <button
          onClick={onClose}
          className="btn-ghost w-full py-2.5 text-sm hover:bg-background"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
