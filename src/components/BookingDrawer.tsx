"use client";

import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";
import HomeBadge from "./HomeBadge";
import { IconClose, IconPencil } from "./Icons";
import { rescheduleBooking, setBookingPaid, updateBookingStatus } from "@/lib/bookings";
import { formatDateLong, formatMoney } from "@/lib/format";
import { services } from "@/lib/services";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import type { Booking, BookingStatus, Staff } from "@/lib/types";

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
  staff,
  onClose,
  onChanged,
}: {
  booking: Booking;
  staff: Staff[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { settings } = useShop();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(booking.payment_method ?? "Cash");
  const [editing, setEditing] = useState(false);

  // Draft fields for edit mode — seeded from the booking whenever it (or
  // edit mode) changes, so switching bookings never shows stale input.
  const [serviceId, setServiceId] = useState(booking.service_id);
  const [staffId, setStaffId] = useState(booking.staff_id);
  const [date, setDate] = useState(booking.booking_date);
  const [time, setTime] = useState(booking.booking_time);

  useEffect(() => {
    setServiceId(booking.service_id);
    setStaffId(booking.staff_id);
    setDate(booking.booking_date);
    setTime(booking.booking_time);
    setEditing(false);
  }, [booking]);

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

  const knownService = services.find((item) => item.id === booking.service_id);
  const selectedService =
    services.find((item) => item.id === serviceId) ?? knownService;
  const selectedStaff = staff.find((member) => member.id === staffId);
  const currency = settings?.currency ?? booking.currency;
  const taxRate = Number(settings?.tax_rate ?? 5) / 100;

  const changed =
    serviceId !== booking.service_id ||
    staffId !== booking.staff_id ||
    date !== booking.booking_date ||
    time !== booking.booking_time;

  // Preview the new total live as the admin edits, same math NewBookingModal
  // uses, so there are no surprises before Save is pressed.
  const previewSubtotal = selectedService
    ? selectedService.price
    : Number(booking.subtotal);
  const previewDiscount = Math.min(Number(booking.discount) || 0, previewSubtotal);
  const previewNet = previewSubtotal - previewDiscount;
  const previewTax = Math.round(previewNet * taxRate * 100) / 100;
  const previewTotal = Math.round((previewNet + previewTax) * 100) / 100;

  async function handleSave() {
    if (!selectedStaff) {
      setError("Pick a staff member.");
      return;
    }
    if (!date || !time) {
      setError("Pick a date and time.");
      return;
    }

    const serviceChanged =
      !!selectedService && selectedService.id !== booking.service_id;

    await run(async () => {
      await rescheduleBooking(booking.id, {
        booking_date: date,
        booking_time: time,
        staff_id: selectedStaff.id,
        staff_name: selectedStaff.name,
        ...(serviceChanged && selectedService
          ? {
              service_id: selectedService.id,
              service_name: selectedService.name,
              duration_minutes: selectedService.duration,
              price: selectedService.price,
              subtotal: previewSubtotal,
              discount: previewDiscount,
              tax: previewTax,
              total: previewTotal,
            }
          : {}),
      });

      // Spell out exactly what moved, so the history is auditable later.
      const parts: string[] = [];
      if (serviceChanged && selectedService) {
        parts.push(`Service ${booking.service_name} → ${selectedService.name}`);
      }
      if (selectedStaff.id !== booking.staff_id) {
        parts.push(`Staff ${booking.staff_name} → ${selectedStaff.name}`);
      }
      if (date !== booking.booking_date || time !== booking.booking_time) {
        parts.push(
          `When ${formatDateLong(booking.booking_date)} ${
            booking.booking_time
          } → ${formatDateLong(date)} ${time}`
        );
      }

      logActivity({
        actor,
        entity: "booking",
        entity_id: booking.id,
        action: "edited",
        summary: `Edited ${booking.full_name}'s appointment`,
        detail: parts.join(" · ") || null,
      });
    });
    setEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
      <button
        className="animate-fade-in flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="animate-slide-in-right flex w-full max-w-sm flex-col overflow-y-auto bg-surface shadow-[var(--shadow-xl)]">
        <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {booking.full_name}
              </h2>
              <HomeBadge location={booking.service_location} />
            </div>
            <p className="truncate text-sm text-muted">{booking.email}</p>
            <p className="text-sm text-muted">{booking.mobile}</p>
            {booking.address && (
              <p className="mt-0.5 text-sm text-muted">{booking.address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6">
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

        <section className="mx-6 mt-4 rounded-2xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Appointment
            </p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-foreground transition hover:bg-background"
              >
                <IconPencil size={13} />
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 p-4">
              <Field label="Service">
                <select
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
                >
                  {!knownService && (
                    <option value={booking.service_id}>
                      {booking.service_name} (current)
                    </option>
                  )}
                  {services.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.duration}min · {currency}{" "}
                      {item.price}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Staff">
                <select
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
                >
                  {!staff.some((member) => member.id === booking.staff_id) && (
                    <option value={booking.staff_id}>
                      {booking.staff_name} (current)
                    </option>
                  )}
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.role}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
                  />
                </Field>
                <Field label="Time">
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
                  />
                </Field>
              </div>

              {selectedService && selectedService.id !== booking.service_id && (
                <div className="rounded-xl bg-background px-3.5 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">New subtotal</span>
                    <span className="tabular-nums">
                      {formatMoney(previewSubtotal, currency)}
                    </span>
                  </div>
                  {previewDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted">Discount</span>
                      <span className="tabular-nums">
                        −{formatMoney(previewDiscount, currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Tax</span>
                    <span className="tabular-nums">
                      {formatMoney(previewTax, currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
                    <span>New total</span>
                    <span className="tabular-nums">
                      {formatMoney(previewTotal, currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={busy || !changed}
                  className="btn-primary flex-1 py-2.5 text-sm hover:btn-primary-hover disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setServiceId(booking.service_id);
                    setStaffId(booking.staff_id);
                    setDate(booking.booking_date);
                    setTime(booking.booking_time);
                    setEditing(false);
                    setError(null);
                  }}
                  className="btn-ghost px-4 py-2.5 text-sm hover:bg-background"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 p-4 text-sm">
              <Row label="Service">{booking.service_name}</Row>
              <Row label="Staff">{booking.staff_name}</Row>
              <Row label="Date">{formatDateLong(booking.booking_date)}</Row>
              <Row label="Time">
                {booking.booking_time} · {booking.duration_minutes} min
              </Row>
            </dl>
          )}
        </section>

        <dl className="mx-6 mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <Row label="Subtotal">
            {formatMoney(Number(booking.subtotal), booking.currency)}
          </Row>
          {Number(booking.discount) > 0 && (
            <Row label="Discount">
              −{formatMoney(Number(booking.discount), booking.currency)}
            </Row>
          )}
          {Number(booking.home_service_fee) > 0 && (
            <Row label="Home service fee">
              {formatMoney(Number(booking.home_service_fee), booking.currency)}
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

        <section className="border-t border-line px-6 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <button
                key={status}
                disabled={busy || booking.status === status}
                onClick={() =>
                  run(async () => {
                    await updateBookingStatus(booking.id, status);
                    logActivity({
                      actor,
                      entity: "booking",
                      entity_id: booking.id,
                      action: `status-${status}`,
                      summary: `Marked ${booking.full_name} as ${statusLabels[
                        status
                      ].toLowerCase()}`,
                      detail: `${statusLabels[booking.status]} → ${
                        statusLabels[status]
                      } · ${booking.service_name} · ${formatDateLong(
                        booking.booking_date
                      )} ${booking.booking_time}`,
                    });
                  })
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

        <section className="border-t border-line px-6 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Payment
          </p>
          {booking.is_paid ? (
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await setBookingPaid(booking.id, false, null);
                  logActivity({
                    actor,
                    entity: "booking",
                    entity_id: booking.id,
                    action: "unpaid",
                    summary: `Marked ${booking.full_name}'s bill as unpaid`,
                    detail: formatMoney(
                      Number(booking.total),
                      booking.currency
                    ),
                  });
                })
              }
              className="btn-ghost w-full py-2.5 text-sm hover:bg-background disabled:opacity-60"
            >
              Mark as unpaid
            </button>
          ) : (
            <div className="space-y-2">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
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
                  run(async () => {
                    await setBookingPaid(booking.id, true, method);
                    logActivity({
                      actor,
                      entity: "booking",
                      entity_id: booking.id,
                      action: "paid",
                      summary: `Took payment from ${booking.full_name}`,
                      detail: `${formatMoney(
                        Number(booking.total),
                        booking.currency
                      )} · ${method}`,
                    });
                  })
                }
                className="btn-primary w-full py-2.5 text-sm hover:btn-primary-hover disabled:opacity-60"
              >
                Mark as paid ·{" "}
                {formatMoney(Number(booking.total), booking.currency)}
              </button>
            </div>
          )}
        </section>

        {error && (
          <p className="mx-6 mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
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
