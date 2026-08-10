"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner, TableSkeleton } from "@/components/Feedback";
import { IconRegister, IconSearch } from "@/components/Icons";
import { useBookings } from "@/lib/useBookings";
import { formatDateLong, formatMoney } from "@/lib/format";
import type { Booking } from "@/lib/types";

type SortKey = "date" | "client" | "method" | "total";
type PaidFilter = "all" | "paid" | "unpaid";

const columns: Array<{ key: SortKey | "index"; label: string; align?: "right" }> = [
  { key: "date", label: "Date" },
  { key: "client", label: "Client" },
  { key: "method", label: "Method" },
  { key: "total", label: "Total", align: "right" },
];

function toCsvValue(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows: Booking[]) {
  const header = [
    "Date",
    "Time",
    "Client",
    "Email",
    "Mobile",
    "Service",
    "Staff",
    "Subtotal",
    "Discount",
    "Tax",
    "Tip",
    "Total",
    "Currency",
    "Payment method",
    "Paid",
    "Status",
  ];
  const lines = rows.map((b) =>
    [
      b.booking_date,
      b.booking_time,
      b.full_name,
      b.email,
      b.mobile,
      b.service_name,
      b.staff_name,
      Number(b.subtotal).toFixed(2),
      Number(b.discount).toFixed(2),
      Number(b.tax).toFixed(2),
      Number(b.tip ?? 0).toFixed(2),
      Number(b.total).toFixed(2),
      b.currency,
      b.payment_method ?? "",
      b.is_paid ? "Yes" : "No",
      b.status,
    ]
      .map(toCsvValue)
      .join(",")
  );
  const csv = [header.map(toCsvValue).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
  const { bookings, loading, error } = useBookings();
  const [query, setQuery] = useState("");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("paid");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = bookings.filter((b) => b.status !== "cancelled");
    if (paidFilter === "paid") list = list.filter((b) => b.is_paid);
    if (paidFilter === "unpaid") list = list.filter((b) => !b.is_paid);
    if (term) {
      list = list.filter(
        (b) =>
          b.full_name.toLowerCase().includes(term) ||
          b.email.toLowerCase().includes(term) ||
          b.service_name.toLowerCase().includes(term) ||
          (b.payment_method ?? "").toLowerCase().includes(term)
      );
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = `${a.booking_date}T${a.booking_time}`.localeCompare(
          `${b.booking_date}T${b.booking_time}`
        );
      } else if (sortKey === "client") {
        cmp = a.full_name.localeCompare(b.full_name);
      } else if (sortKey === "method") {
        cmp = (a.payment_method ?? "").localeCompare(b.payment_method ?? "");
      } else if (sortKey === "total") {
        cmp = Number(a.total) - Number(b.total);
      }
      return cmp * sortDir;
    });
    return sorted;
  }, [bookings, query, paidFilter, sortKey, sortDir]);

  const totals = useMemo(() => {
    return rows.reduce(
      (sum, b) => ({
        subtotal: sum.subtotal + Number(b.subtotal),
        discount: sum.discount + Number(b.discount),
        tax: sum.tax + Number(b.tax),
        tip: sum.tip + Number(b.tip ?? 0),
        total: sum.total + Number(b.total),
      }),
      { subtotal: 0, discount: 0, tax: 0, tip: 0, total: 0 }
    );
  }, [rows]);

  const currency = rows[0]?.currency ?? "AED";

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={`${rows.length} transaction${rows.length === 1 ? "" : "s"} · ${formatMoney(
          totals.total,
          currency
        )} total`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-40 shrink-0 sm:w-52">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full rounded-xl border border-line py-2 pl-8 pr-3 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
              />
            </div>
            <button
              onClick={() => downloadCsv(rows)}
              disabled={rows.length === 0}
              className="btn-primary flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm hover:btn-primary-hover disabled:opacity-50"
            >
              <IconRegister size={15} />
              <span className="hidden sm:inline">Export to Excel</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="flex gap-1 rounded-xl border border-line p-1 w-fit">
          {(["all", "paid", "unpaid"] as PaidFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPaidFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                paidFilter === f
                  ? "bg-foreground text-surface"
                  : "text-muted hover:bg-background"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-hidden card">
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<IconRegister size={22} />}
              title="No transactions yet"
              detail="Paid appointments will show up here as a spreadsheet-style ledger."
            />
          ) : (
            <>
              {/* Phones get a card list — a 12-column ledger behind a
                  horizontal scrollbar is unreadable at 375px. */}
              <ul className="divide-y divide-line sm:hidden">
                {rows.map((b) => (
                  <li key={b.id} className="flex flex-col gap-1.5 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">
                        {b.full_name}
                      </p>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(Number(b.total), b.currency)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted">
                      {b.service_name} · {b.staff_name}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="tabular-nums">
                        {formatDateLong(b.booking_date)} · {b.booking_time}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {b.payment_method ?? "—"}
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            b.is_paid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.is_paid ? "Paid" : "Unpaid"}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-surface-2 px-4 py-3 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatMoney(totals.total, currency)}
                  </span>
                </li>
              </ul>

              {/* Bounded height gives this box real vertical overflow, which
                  is what lets the header row below actually stick. */}
              <div className="hidden max-h-[calc(100vh-19rem)] overflow-auto sm:block">
              {/* "Excel type" grid: dense rows, right-aligned numerics, sticky
                  header, zebra striping — reads like a spreadsheet ledger. */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase text-muted">
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 font-medium">
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key as SortKey)}
                        className={`sticky top-0 z-10 cursor-pointer select-none border-r border-line bg-surface-2 px-3 py-2.5 font-medium last:border-r-0 ${
                          col.align === "right" ? "text-right" : ""
                        }`}
                      >
                        {col.label}
                        {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 font-medium">
                      Service
                    </th>
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 font-medium">
                      Staff
                    </th>
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 text-right font-medium">
                      Subtotal
                    </th>
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 text-right font-medium">
                      Discount
                    </th>
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 text-right font-medium">
                      Tax
                    </th>
                    <th className="sticky top-0 z-10 border-r border-line bg-surface-2 px-3 py-2.5 text-right font-medium">
                      Tip
                    </th>
                    <th className="sticky top-0 z-10 bg-surface-2 px-3 py-2.5 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b, i) => (
                    <tr
                      key={b.id}
                      className={`border-b border-line ${
                        i % 2 === 1 ? "bg-background/40" : ""
                      }`}
                    >
                      <td className="border-r border-line px-3 py-2 tabular-nums text-muted">
                        {i + 1}
                      </td>
                      <td className="whitespace-nowrap border-r border-line px-3 py-2 tabular-nums">
                        {formatDateLong(b.booking_date)} · {b.booking_time}
                      </td>
                      <td className="border-r border-line px-3 py-2">
                        <p className="font-medium">{b.full_name}</p>
                        <p className="text-xs text-muted">{b.email}</p>
                      </td>
                      <td className="border-r border-line px-3 py-2">
                        {b.payment_method ?? "—"}
                      </td>
                      <td className="border-r border-line px-3 py-2 text-right font-medium tabular-nums">
                        {formatMoney(Number(b.total), b.currency)}
                      </td>
                      <td className="border-r border-line px-3 py-2">
                        {b.service_name}
                      </td>
                      <td className="border-r border-line px-3 py-2">
                        {b.staff_name}
                      </td>
                      <td className="border-r border-line px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(b.subtotal), b.currency)}
                      </td>
                      <td className="border-r border-line px-3 py-2 text-right tabular-nums">
                        {Number(b.discount) > 0
                          ? `−${formatMoney(Number(b.discount), b.currency)}`
                          : "—"}
                      </td>
                      <td className="border-r border-line px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(b.tax), b.currency)}
                      </td>
                      <td className="border-r border-line px-3 py-2 text-right tabular-nums">
                        {Number(b.tip ?? 0) > 0
                          ? formatMoney(Number(b.tip), b.currency)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.is_paid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.is_paid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-surface-2 text-sm font-semibold">
                    <td className="border-r border-line px-3 py-2.5" colSpan={4}>
                      Totals
                    </td>
                    <td className="border-r border-line px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(totals.total, currency)}
                    </td>
                    <td className="border-r border-line px-3 py-2.5" colSpan={2} />
                    <td className="border-r border-line px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(totals.subtotal, currency)}
                    </td>
                    <td className="border-r border-line px-3 py-2.5 text-right tabular-nums">
                      {totals.discount > 0
                        ? `−${formatMoney(totals.discount, currency)}`
                        : "—"}
                    </td>
                    <td className="border-r border-line px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(totals.tax, currency)}
                    </td>
                    <td className="border-r border-line px-3 py-2.5 text-right tabular-nums">
                      {formatMoney(totals.tip, currency)}
                    </td>
                    <td className="px-3 py-2.5" />
                  </tr>
                </tfoot>
              </table>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
