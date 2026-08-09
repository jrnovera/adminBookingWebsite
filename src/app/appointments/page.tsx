"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { updateBookingStatus } from "@/lib/bookings";
import { formatDateLong, formatMoney } from "@/lib/format";
import { useBookings } from "@/lib/useBookings";
import type { Booking, BookingStatus } from "@/lib/types";

const filters: Array<BookingStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export default function AppointmentsPage() {
  const { bookings, loading, error, reload } = useBookings();
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all"
        ? bookings
        : bookings.filter((booking) => booking.status === filter),
    [bookings, filter]
  );

  async function changeStatus(booking: Booking, status: BookingStatus) {
    setSaving(true);
    setSaveError(null);
    try {
      await updateBookingStatus(booking.id, status);
      await reload();
      setSelected({ ...booking, status });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={`${visible.length} of ${bookings.length} bookings`}
        action={
          <div className="flex flex-wrap gap-1">
            {filters.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`rounded-full px-3 py-1.5 text-xs capitalize transition ${
                  filter === option
                    ? "bg-foreground text-white"
                    : "border border-line hover:bg-background"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        }
      />

      <main className="flex flex-1 flex-col gap-6 p-6 xl:flex-row">
        <section className="min-w-0 flex-1 overflow-hidden card">
          {error && (
            <p className="px-5 py-4 text-sm text-rose-700">{error}</p>
          )}
          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No appointments to show.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">When</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((booking) => (
                    <tr
                      key={booking.id}
                      onClick={() => setSelected(booking)}
                      className={`cursor-pointer hover:bg-background ${
                        selected?.id === booking.id ? "bg-background" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium">{booking.full_name}</p>
                        <p className="text-xs text-muted">
                          {booking.mobile}
                        </p>
                      </td>
                      <td className="px-5 py-3">{booking.service_name}</td>
                      <td className="px-5 py-3">{booking.staff_name}</td>
                      <td className="px-5 py-3">
                        <p>{formatDateLong(booking.booking_date)}</p>
                        <p className="text-xs text-muted">
                          {booking.booking_time}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {formatMoney(Number(booking.total), booking.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="w-full shrink-0 card p-5 xl:w-80">
          <h2 className="text-sm font-semibold">Appointment Details</h2>
          {!selected ? (
            <p className="mt-4 text-sm text-muted">
              Select an appointment to see details.
            </p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-medium">{selected.full_name}</p>
                <p className="text-xs text-muted">{selected.email}</p>
                <p className="text-xs text-muted">{selected.mobile}</p>
              </div>

              <Detail label="Service" value={selected.service_name} />
              <Detail label="Staff" value={selected.staff_name} />
              <Detail
                label="Date"
                value={`${formatDateLong(selected.booking_date)} · ${selected.booking_time}`}
              />
              <Detail
                label="Duration"
                value={`${selected.duration_minutes} min`}
              />
              <Detail
                label="Subtotal"
                value={formatMoney(Number(selected.subtotal), selected.currency)}
              />
              {Number(selected.discount) > 0 && (
                <Detail
                  label="Discount"
                  value={`−${formatMoney(
                    Number(selected.discount),
                    selected.currency
                  )}`}
                />
              )}
              <Detail
                label="Tax"
                value={formatMoney(Number(selected.tax), selected.currency)}
              />
              <Detail
                label="Total"
                value={formatMoney(Number(selected.total), selected.currency)}
              />
              {selected.address && (
                <Detail label="Address" value={selected.address} />
              )}
              {selected.notes && <Detail label="Notes" value={selected.notes} />}
              {selected.voucher_code && (
                <Detail label="Voucher" value={selected.voucher_code} />
              )}

              <div className="pt-2">
                <p className="mb-2 text-xs uppercase text-muted">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["pending", "confirmed", "completed", "cancelled"] as const
                  ).map((status) => (
                    <button
                      key={status}
                      disabled={saving || selected.status === status}
                      onClick={() => changeStatus(selected, status)}
                      className={`rounded-lg px-3 py-1.5 text-xs capitalize transition disabled:opacity-50 ${
                        selected.status === status
                          ? "bg-foreground text-white"
                          : "border border-line hover:bg-background"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {saveError && (
                  <p className="mt-2 text-xs text-rose-700">{saveError}</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs uppercase text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
