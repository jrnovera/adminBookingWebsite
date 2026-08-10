"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { EmptyState, ErrorBanner, TableSkeleton } from "@/components/Feedback";
import { IconClock } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { updateBookingStatus } from "@/lib/bookings";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
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

const filterLabels: Record<BookingStatus | "all", string> = {
  all: "All",
  pending: "Pending",
  confirmed: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export default function AppointmentsPage() {
  const { bookings, loading, error, reload } = useBookings();
  const toast = useToast();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
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
      toast.success(
        "Status updated",
        `${booking.full_name} is now ${filterLabels[status].toLowerCase()}.`
      );
      logActivity({
        actor,
        entity: "booking",
        entity_id: booking.id,
        action: `status-${status}`,
        summary: `Marked ${booking.full_name} as ${filterLabels[
          status
        ].toLowerCase()}`,
        detail: `${filterLabels[booking.status]} → ${filterLabels[status]} · ${
          booking.service_name
        } · ${formatDateLong(booking.booking_date)} ${booking.booking_time}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setSaveError(message);
      toast.error("Update failed", message);
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
          <div className="flex gap-1.5">
            {filters.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-all duration-150 ${
                  filter === option
                    ? "bg-foreground text-white shadow-sm"
                    : "border border-line text-foreground/70 hover:bg-background"
                }`}
              >
                {filterLabels[option]}
              </button>
            ))}
          </div>
        }
      />

      <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6 xl:flex-row">
        <section className="min-w-0 flex-1 overflow-hidden card">
          {error && (
            <div className="p-4">
              <ErrorBanner message={error} />
            </div>
          )}
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconClock size={22} />}
              title="No appointments to show"
              detail="Try a different status filter."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Client</th>
                      <th className="px-5 py-3 font-medium">Service</th>
                      <th className="px-5 py-3 font-medium">Staff</th>
                      <th className="px-5 py-3 font-medium">When</th>
                      <th className="px-5 py-3 font-medium">Total</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((booking) => (
                      <tr
                        key={booking.id}
                        onClick={() => setSelected(booking)}
                        className={`row-hover cursor-pointer hover:bg-background ${
                          selected?.id === booking.id
                            ? "bg-primary-50/60"
                            : ""
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium">{booking.full_name}</p>
                          <p className="text-xs text-muted">
                            {booking.mobile}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">{booking.service_name}</td>
                        <td className="px-5 py-3.5">{booking.staff_name}</td>
                        <td className="px-5 py-3.5">
                          <p>{formatDateLong(booking.booking_date)}</p>
                          <p className="text-xs tabular-nums text-muted">
                            {booking.booking_time}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">
                          {formatMoney(Number(booking.total), booking.currency)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <ul className="divide-y divide-line sm:hidden">
                {visible.map((booking) => (
                  <li key={booking.id}>
                    <button
                      onClick={() => setSelected(booking)}
                      className={`flex w-full flex-col gap-1.5 px-4 py-3.5 text-left active:bg-background ${
                        selected?.id === booking.id ? "bg-primary-50/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">
                          {booking.full_name}
                        </p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {booking.service_name} · {booking.staff_name}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="tabular-nums">
                          {formatDateLong(booking.booking_date)} ·{" "}
                          {booking.booking_time}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMoney(Number(booking.total), booking.currency)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Desktop side panel */}
        <aside className="hidden w-full shrink-0 card p-5 xl:block xl:w-80">
          <h2 className="text-sm font-semibold">Appointment Details</h2>
          {!selected ? (
            <p className="mt-4 text-sm text-muted">
              Select an appointment to see details.
            </p>
          ) : (
            <DetailPanel
              booking={selected}
              saving={saving}
              saveError={saveError}
              onChangeStatus={changeStatus}
            />
          )}
        </aside>
      </main>

      {/* Mobile / tablet detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            onClick={() => setSelected(null)}
            aria-label="Close details"
            className="animate-fade-in absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px]"
          />
          <div className="animate-pop-in absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-[var(--shadow-xl)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Appointment Details</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-xs font-medium text-muted"
              >
                Close
              </button>
            </div>
            <DetailPanel
              booking={selected}
              saving={saving}
              saveError={saveError}
              onChangeStatus={changeStatus}
            />
          </div>
        </div>
      )}
    </>
  );
}

function DetailPanel({
  booking,
  saving,
  saveError,
  onChangeStatus,
}: {
  booking: Booking;
  saving: boolean;
  saveError: string | null;
  onChangeStatus: (booking: Booking, status: BookingStatus) => void;
}) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      <div>
        <p className="font-medium">{booking.full_name}</p>
        <p className="text-xs text-muted">{booking.email}</p>
        <p className="text-xs text-muted">{booking.mobile}</p>
      </div>

      <Detail label="Service" value={booking.service_name} />
      <Detail label="Staff" value={booking.staff_name} />
      <Detail
        label="Date"
        value={`${formatDateLong(booking.booking_date)} · ${booking.booking_time}`}
      />
      <Detail label="Duration" value={`${booking.duration_minutes} min`} />
      <Detail
        label="Subtotal"
        value={formatMoney(Number(booking.subtotal), booking.currency)}
      />
      {Number(booking.discount) > 0 && (
        <Detail
          label="Discount"
          value={`−${formatMoney(Number(booking.discount), booking.currency)}`}
        />
      )}
      <Detail label="Tax" value={formatMoney(Number(booking.tax), booking.currency)} />
      <Detail
        label="Total"
        value={formatMoney(Number(booking.total), booking.currency)}
      />
      {booking.address && <Detail label="Address" value={booking.address} />}
      {booking.notes && <Detail label="Notes" value={booking.notes} />}
      {booking.voucher_code && (
        <Detail label="Voucher" value={booking.voucher_code} />
      )}

      <div className="pt-2">
        <p className="mb-2 text-xs uppercase text-muted">Status</p>
        <div className="flex flex-wrap gap-2">
          {(["pending", "confirmed", "completed", "cancelled"] as const).map(
            (status) => (
              <button
                key={status}
                disabled={saving || booking.status === status}
                onClick={() => onChangeStatus(booking, status)}
                className={`rounded-lg px-3 py-1.5 text-xs capitalize transition disabled:opacity-50 ${
                  booking.status === status
                    ? "bg-foreground text-white"
                    : "border border-line hover:bg-background"
                }`}
              >
                {filterLabels[status]}
              </button>
            )
          )}
        </div>
        {saveError && <ErrorBanner message={saveError} />}
      </div>
    </div>
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
