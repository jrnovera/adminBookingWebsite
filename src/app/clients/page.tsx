"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { deriveClients } from "@/lib/bookings";
import { formatDateLong, formatMoney } from "@/lib/format";
import { useBookings } from "@/lib/useBookings";

export default function ClientsPage() {
  const { bookings, loading, error } = useBookings();
  const [query, setQuery] = useState("");

  const clients = useMemo(() => {
    const all = deriveClients(bookings);
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (client) =>
        client.full_name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.mobile.includes(term)
    );
  }, [bookings, query]);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"}`}
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or mobile"
            className="w-64 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        }
      />

      <main className="flex-1 p-6">
        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="overflow-hidden card">
          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : clients.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No clients yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Visits</th>
                    <th className="px-5 py-3">Total Spent</th>
                    <th className="px-5 py-3">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clients.map((client) => (
                    <tr key={client.email} className="hover:bg-background">
                      <td className="px-5 py-3 font-medium">
                        {client.full_name}
                      </td>
                      <td className="px-5 py-3">
                        <p>{client.email}</p>
                        <p className="text-xs text-muted">
                          {client.mobile}
                        </p>
                      </td>
                      <td className="px-5 py-3">{client.visits}</td>
                      <td className="px-5 py-3">
                        {formatMoney(client.totalSpent, client.currency)}
                      </td>
                      <td className="px-5 py-3">
                        {formatDateLong(client.lastVisit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
