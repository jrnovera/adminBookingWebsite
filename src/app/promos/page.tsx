"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PromoForm from "@/components/PromoForm";
import {
  deletePromo,
  fetchPromos,
  promoState,
  promoStateStyles,
  updatePromo,
} from "@/lib/promos";
import { formatDateLong, formatMoney, toDateKey } from "@/lib/format";
import type { Promo } from "@/lib/types";

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Promo | "new" | null>(null);
  const today = toDateKey(new Date());

  const load = useCallback(() => {
    fetchPromos().then(
      (rows) => {
        setPromos(rows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load promos");
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  async function toggleActive(promo: Promo) {
    setPromos((current) =>
      current.map((item) =>
        item.id === promo.id ? { ...item, active: !item.active } : item
      )
    );
    try {
      await updatePromo(promo.id, { active: !promo.active });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      load();
    }
  }

  async function handleDelete(promo: Promo) {
    if (!confirm(`Delete promo ${promo.code}?`)) return;
    try {
      await deletePromo(promo.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Promos"
        subtitle={`${promos.length} promo code${promos.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={() => setEditing("new")}
            className="btn-primary px-4 py-2 text-sm hover:opacity-90"
          >
            + New Promo
          </button>
        }
      />

      <main className="flex-1 space-y-4 p-6">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : promos.length === 0 ? (
          <div className="card border-dashed p-10 text-center">
            <p className="text-sm text-muted">
              No promo codes yet. Create one to offer a discount at checkout.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {promos.map((promo) => {
              const state = promoState(promo, today);
              return (
                <article
                  key={promo.id}
                  className="card p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-base font-semibold tracking-wider">
                        {promo.code}
                      </p>
                      {promo.description && (
                        <p className="text-sm text-muted">
                          {promo.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${promoStateStyles[state]}`}
                    >
                      {state}
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-semibold text-primary">
                    {promo.discount_type === "percent"
                      ? `${Number(promo.discount_value)}% off`
                      : `${formatMoney(Number(promo.discount_value))} off`}
                  </p>

                  <dl className="mt-3 space-y-1.5 text-sm">
                    <Row label="Runs">
                      {promo.starts_on || promo.ends_on
                        ? `${
                            promo.starts_on
                              ? formatDateLong(promo.starts_on)
                              : "Any time"
                          } → ${
                            promo.ends_on
                              ? formatDateLong(promo.ends_on)
                              : "No end"
                          }`
                        : "Always"}
                    </Row>
                    <Row label="Used">
                      {promo.times_used}
                      {promo.usage_limit !== null
                        ? ` / ${promo.usage_limit}`
                        : ""}
                    </Row>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditing(promo)}
                      className="btn-ghost px-3 py-1.5 text-xs hover:bg-background"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(promo)}
                      className="btn-ghost px-3 py-1.5 text-xs hover:bg-background"
                    >
                      {promo.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(promo)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {editing && (
        <PromoForm
          promo={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
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
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
