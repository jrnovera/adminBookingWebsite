"use client";

import { useState } from "react";
import Modal from "./Modal";
import { IconAlert } from "./Icons";

/**
 * Replaces window.confirm for destructive actions so the prompt matches the
 * rest of the UI and can show progress while the request is in flight.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex gap-3.5">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              tone === "danger"
                ? "bg-rose-50 text-rose-600"
                : "bg-primary-50 text-primary-dark"
            }`}
          >
            <IconAlert size={20} />
          </span>
          <div className="min-w-0 pt-1 text-sm leading-relaxed text-muted">
            {message}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="btn-ghost px-4 py-2.5 text-sm hover:bg-background disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition hover:opacity-90 disabled:opacity-60 ${
              tone === "danger" ? "bg-rose-600" : "bg-foreground"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
