"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PromoForm from "@/components/PromoForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { IconPlus, IconTag } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  deletePromo,
  fetchPromos,
  promoState,
  promoStateStyles,
  updatePromo,
} from "@/lib/promos";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { formatDateLong, formatMoney, toDateKey } from "@/lib/format";
import type { Promo } from "@/lib/types";

export default function PromosPage() {
  const toast = useToast();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Promo | "new" | null>(null);
  const [removing, setRemoving] = useState<Promo | null>(null);
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
      toast.success(
        promo.active ? "Promo paused" : "Promo activated",
        promo.code
      );
      logActivity({
        actor,
        entity: "promo",
        entity_id: promo.id,
        action: promo.active ? "paused" : "activated",
        summary: `${promo.active ? "Paused" : "Activated"} promo ${promo.code}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
      toast.error("Update failed", message);
      load();
    }
  }

  async function handleDelete() {
    if (!removing) return;
    try {
      await deletePromo(removing.id);
      toast.success("Promo deleted", removing.code);
      logActivity({
        actor,
        entity: "promo",
        entity_id: removing.id,
        action: "deleted",
        summary: `Deleted promo ${removing.code}`,
      });
      setRemoving(null);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      toast.error("Delete failed", message);
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
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm hover:btn-primary-hover"
          >
            <IconPlus size={15} />
            New Promo
          </button>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="card space-y-3 p-5">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-7 w-32" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="card border-dashed">
            <EmptyState
              icon={<IconTag size={22} />}
              title="No promo codes yet"
              detail="Create one to offer a discount at checkout."
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {promos.map((promo) => {
              const state = promoState(promo, today);
              return (
                <article
                  key={promo.id}
                  className="card-interactive hover:card-interactive-hover p-5"
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
                      onClick={() => setRemoving(promo)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 transition hover:bg-rose-50"
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
            const wasNew = editing === "new";
            setEditing(null);
            load();
            toast.success(wasNew ? "Promo created" : "Promo updated");
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Delete promo?"
          message={
            <>
              <span className="font-mono font-medium text-foreground">
                {removing.code}
              </span>{" "}
              will stop working immediately.
            </>
          }
          confirmLabel="Delete promo"
          onClose={() => setRemoving(null)}
          onConfirm={handleDelete}
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
