"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createPromo, updatePromo } from "@/lib/promos";
import type { Promo } from "@/lib/types";

export default function PromoForm({
  promo,
  onClose,
  onSaved,
}: {
  promo: Promo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [description, setDescription] = useState(promo?.description ?? "");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    promo?.discount_type ?? "percent"
  );
  const [discountValue, setDiscountValue] = useState(
    String(promo?.discount_value ?? "10")
  );
  const [startsOn, setStartsOn] = useState(promo?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(promo?.ends_on ?? "");
  const [usageLimit, setUsageLimit] = useState(
    promo?.usage_limit !== null && promo?.usage_limit !== undefined
      ? String(promo.usage_limit)
      : ""
  );
  const [active, setActive] = useState(promo?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (endsOn && startsOn && endsOn < startsOn) {
      setError("End date must be on or after the start date.");
      return;
    }

    setBusy(true);
    setError(null);

    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      usage_limit: usageLimit ? Math.max(0, Number(usageLimit)) : null,
      active,
    };

    try {
      if (promo) await updatePromo(promo.id, payload);
      else await createPromo(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <Modal title={promo ? "Edit promo" : "New promo"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Code
          </span>
          <input
            required
            value={code}
            placeholder="SUMMER20"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="w-full rounded-lg border border-line px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Description
          </span>
          <input
            value={description}
            placeholder="20% off all colour services"
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Type
            </span>
            <select
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as "percent" | "fixed")
              }
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Value
            </span>
            <input
              required
              type="number"
              step="0.01"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Starts
            </span>
            <input
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
              Ends
            </span>
            <input
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Usage limit (blank = unlimited)
          </span>
          <input
            type="number"
            value={usageLimit}
            onChange={(event) => setUsageLimit(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
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
