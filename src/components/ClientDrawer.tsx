"use client";

import StatusBadge from "./StatusBadge";
import { IconClose } from "./Icons";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { Booking, Client } from "@/lib/types";

/** Full profile + booking history for one client, opened from the Clients list. */
export default function ClientDrawer({
  client,
  bookings,
  onClose,
}: {
  client: Client;
  bookings: Booking[];
  onClose: () => void;
}) {
  const history = bookings
    .filter((b) => b.email.toLowerCase() === client.email.toLowerCase())
    .sort((a, b) =>
      `${b.booking_date}T${b.booking_time}`.localeCompare(
        `${a.booking_date}T${a.booking_time}`
      )
    );

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
            <h2 className="truncate text-lg font-semibold">
              {client.full_name}
            </h2>
            <p className="truncate text-sm text-muted">{client.email}</p>
            <p className="text-sm text-muted">{client.mobile}</p>
            <p className="mt-0.5 text-sm text-muted">
              {client.address ?? "No address on file"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          >
            <IconClose size={16} />
          </button>
        </div>

        <dl className="mx-6 grid grid-cols-2 gap-3 rounded-2xl border border-line p-4 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted">Visits</dt>
            <dd className="mt-0.5 font-semibold">{client.visits}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Total spent</dt>
            <dd className="mt-0.5 font-semibold">
              {formatMoney(client.totalSpent, client.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">First visit</dt>
            <dd className="mt-0.5">{formatDateLong(client.firstVisit)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Last visit</dt>
            <dd className="mt-0.5">{formatDateLong(client.lastVisit)}</dd>
          </div>
        </dl>

        <section className="mt-4 flex-1 border-t border-line px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Booking history
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-muted">No bookings found.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((booking) => (
                <li
                  key={booking.id}
                  className="rounded-xl border border-line px-3.5 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {booking.service_name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateLong(booking.booking_date)} ·{" "}
                        {booking.booking_time} · {booking.staff_name}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>
                      {booking.is_paid
                        ? `Paid${
                            booking.payment_method
                              ? ` · ${booking.payment_method}`
                              : ""
                          }`
                        : "Unpaid"}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatMoney(Number(booking.total), booking.currency)}
                    </span>
                  </div>
                  {booking.notes && (
                    <p className="mt-2 text-xs text-muted">
                      Notes: {booking.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
