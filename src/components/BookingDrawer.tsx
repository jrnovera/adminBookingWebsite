"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { setBookingPaid, updateBookingStatus } from "@/lib/bookings";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";

const statuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const methods = ["Cash", "Card", "Gift Card", "Online"];

export default function BookingDrawer({
  booking,
  onClose,
  onChanged,
}: {
  booking: Booking;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(booking.payment_method ?? "Cash");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <button
        className="flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="w-full max-w-sm overflow-y-auto bg-surface p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{booking.full_name}</h2>
            <p className="text-sm text-muted">{booking.email}</p>
            <p className="text-sm text-muted">{booking.mobile}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              booking.is_paid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-foreground/10 text-muted"
            }`}
          >
            {booking.is_paid
              ? `Paid${booking.payment_method ? ` · ${booking.payment_method}` : ""}`
              : "Unpaid"}
          </span>
        </div>

        <dl className="space-y-2 border-y border-line py-4 text-sm">
          <Row label="Service">{booking.service_name}</Row>
          <Row label="Staff">{booking.staff_name}</Row>
          <Row label="Date">{formatDateLong(booking.booking_date)}</Row>
          <Row label="Time">
            {booking.booking_time} · {booking.duration_minutes} min
          </Row>
          <Row label="Subtotal">
            {formatMoney(Number(booking.subtotal), booking.currency)}
          </Row>
          {Number(booking.discount) > 0 && (
            <Row label="Discount">
              −{formatMoney(Number(booking.discount), booking.currency)}
            </Row>
          )}
          <Row label="Tax">
            {formatMoney(Number(booking.tax), booking.currency)}
          </Row>
          <Row label="Total">
            <span className="font-semibold">
              {formatMoney(Number(booking.total), booking.currency)}
            </span>
          </Row>
          {booking.notes && <Row label="Notes">{booking.notes}</Row>}
          {booking.voucher_code && (
            <Row label="Voucher">{booking.voucher_code}</Row>
          )}
        </dl>

        <section className="py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status}
                disabled={busy || booking.status === status}
                onClick={() =>
                  run(() => updateBookingStatus(booking.id, status))
                }
                className={`rounded-xl px-3 py-1.5 text-xs transition disabled:opacity-50 ${
                  booking.status === status
                    ? "bg-foreground text-white"
                    : "btn-ghost hover:bg-background"
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Payment
          </p>
          {booking.is_paid ? (
            <button
              disabled={busy}
              onClick={() => run(() => setBookingPaid(booking.id, false, null))}
              className="btn-ghost w-full py-2.5 text-sm hover:bg-background disabled:opacity-60"
            >
              Mark as unpaid
            </button>
          ) : (
            <div className="space-y-2">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
              >
                {methods.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={() =>
                  run(() => setBookingPaid(booking.id, true, method))
                }
                className="btn-primary w-full py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
              >
                Mark as paid ·{" "}
                {formatMoney(Number(booking.total), booking.currency)}
              </button>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-rose-700">{error}</p>}
      </aside>
    </div>
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
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
