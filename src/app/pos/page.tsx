"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PosCheckout from "@/components/PosCheckout";
import StatusBadge from "@/components/StatusBadge";
import { useBookings } from "@/lib/useBookings";
import { useShop } from "@/lib/shop";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { Booking } from "@/lib/types";

export default function PosPage() {
  const { bookings, loading, error, reload } = useBookings();
  const { settings } = useShop();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  const currency = settings?.currency ?? "AED";

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bookings
      .filter((booking) => booking.status !== "cancelled")
      .filter((booking) => (showPaid ? true : !booking.is_paid))
      .filter((booking) =>
        term
          ? booking.full_name.toLowerCase().includes(term) ||
            booking.mobile.includes(term) ||
            booking.email.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => b.booking_date.localeCompare(a.booking_date));
  }, [bookings, query, showPaid]);

  return (
    <>
      <PageHeader
        title="POS / Checkout"
        subtitle="Look up a client's bill, add extras and take payment"
      />

      <main className="flex-1 space-y-4 p-6">
        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, mobile or email…"
            className="w-full max-w-sm rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(event) => setShowPaid(event.target.checked)}
            />
            Include paid
          </label>
        </div>

        {loading && <p className="text-sm text-muted">Loading…</p>}

        {!loading && results.length === 0 && (
          <p className="rounded-xl bg-background px-4 py-8 text-center text-sm text-muted">
            No matching bills.
          </p>
        )}

        <div className="grid gap-3">
          {results.map((booking) => (
            <button
              key={booking.id}
              onClick={() => setSelected(booking)}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:border-foreground/30"
            >
              <div className="min-w-0">
                <p className="font-semibold">{booking.full_name}</p>
                <p className="truncate text-sm text-muted">
                  {booking.service_name} · {booking.staff_name}
                </p>
                <p className="text-xs text-muted">
                  {formatDateLong(booking.booking_date)} · {booking.booking_time}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={booking.status} />
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    booking.is_paid
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {booking.is_paid ? "Paid" : "Unpaid"}
                </span>
                <span className="font-semibold">
                  {formatMoney(Number(booking.total), booking.currency)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {selected && (
        <PosCheckout
          booking={selected}
          currency={currency}
          taxRate={Number(settings?.tax_rate ?? 5)}
          onClose={() => setSelected(null)}
          onPaid={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}
