"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PosCheckout from "@/components/PosCheckout";
import StatusBadge from "@/components/StatusBadge";
import { EmptyState, ErrorBanner, TableSkeleton } from "@/components/Feedback";
import { IconRegister, IconSearch } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useBookings } from "@/lib/useBookings";
import { useShop } from "@/lib/shop";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { Booking } from "@/lib/types";

export default function PosPage() {
  const { bookings, loading, error, reload } = useBookings();
  const { settings } = useShop();
  const toast = useToast();
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

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <IconSearch
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, mobile or email…"
              className="w-full rounded-xl border border-line py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted select-none">
            <input
              type="checkbox"
              checked={showPaid}
              onChange={(event) => setShowPaid(event.target.checked)}
              className="h-4 w-4 accent-foreground"
            />
            Include paid
          </label>
        </div>

        {loading ? (
          <div className="card overflow-hidden">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : results.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<IconRegister size={22} />}
              title="No matching bills"
              detail="Try a different search or include already-paid bills."
            />
          </div>
        ) : (
          <div className="grid gap-3">
            {results.map((booking) => (
              <button
                key={booking.id}
                onClick={() => setSelected(booking)}
                className="card-interactive hover:card-interactive-hover flex flex-wrap items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{booking.full_name}</p>
                  <p className="truncate text-sm text-muted">
                    {booking.service_name} · {booking.staff_name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateLong(booking.booking_date)} ·{" "}
                    {booking.booking_time}
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
                  <span className="font-semibold tabular-nums">
                    {formatMoney(Number(booking.total), booking.currency)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
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
            toast.success("Payment recorded", "The bill has been marked paid.");
          }}
        />
      )}
    </>
  );
}
