"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchBookings } from "@/lib/bookings";
import { fetchProducts, stockLevel } from "@/lib/inventory";
import { formatDateLong, toDateKey } from "@/lib/format";
import type { Booking, Product } from "@/lib/types";

type Note = {
  id: string;
  href: string;
  title: string;
  detail: string;
  tone: "amber" | "rose" | "primary";
};

const toneStyles: Record<Note["tone"], string> = {
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  primary: "bg-primary-100 text-primary-dark",
};

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchBookings().then(setBookings, () => {});
    fetchProducts().then(setProducts, () => {});
  }, []);

  const notes = useMemo(() => {
    const today = toDateKey(new Date());
    const list: Note[] = [];

    for (const booking of bookings) {
      if (booking.status === "pending" && booking.booking_date >= today) {
        list.push({
          id: `pending-${booking.id}`,
          href: "/appointments",
          title: `${booking.full_name} needs confirmation`,
          detail: `${booking.service_name} · ${formatDateLong(
            booking.booking_date
          )} ${booking.booking_time}`,
          tone: "amber",
        });
      }
    }

    for (const booking of bookings) {
      if (booking.booking_date === today && booking.status === "confirmed") {
        list.push({
          id: `today-${booking.id}`,
          href: "/calendar",
          title: `Today: ${booking.full_name}`,
          detail: `${booking.service_name} at ${booking.booking_time}`,
          tone: "primary",
        });
      }
    }

    for (const product of products) {
      const level = stockLevel(product);
      if (level === "in") continue;
      list.push({
        id: `stock-${product.id}`,
        href: "/inventory",
        title:
          level === "out"
            ? `${product.name} is out of stock`
            : `${product.name} is running low`,
        detail: `${product.stock} left in stock`,
        tone: level === "out" ? "rose" : "amber",
      });
    }

    return list;
  }, [bookings, products]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-line text-sm hover:bg-background"
        aria-label="Notifications"
      >
        🔔
        {notes.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {notes.length > 9 ? "9+" : notes.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden card shadow-lg">
            <p className="border-b border-line px-4 py-2.5 text-sm font-semibold">
              Notifications
            </p>

            {notes.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                You are all caught up.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={note.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 hover:bg-background"
                    >
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          toneStyles[note.tone]
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {note.title}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {note.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
