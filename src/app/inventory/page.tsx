"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ProductForm from "@/components/ProductForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EmptyState, ErrorBanner, TableSkeleton } from "@/components/Feedback";
import { IconBox, IconPlus, IconSearch } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  deleteProduct,
  fetchProducts,
  stockLabels,
  stockLevel,
  stockStyles,
  updateProduct,
} from "@/lib/inventory";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function InventoryPage() {
  const toast = useToast();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);

  const load = useCallback(() => {
    fetchProducts().then(
      (rows) => {
        setProducts(rows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load products");
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term)
    );
  }, [products, query]);

  const summary = useMemo(() => {
    const value = products.reduce(
      (total, product) => total + product.stock * Number(product.cost),
      0
    );
    return {
      value,
      lowCount: products.filter((p) => stockLevel(p) === "low").length,
      outCount: products.filter((p) => stockLevel(p) === "out").length,
    };
  }, [products]);

  async function adjustStock(product: Product, delta: number) {
    const next = Math.max(0, product.stock + delta);
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, stock: next } : item
      )
    );
    try {
      await updateProduct(product.id, { stock: next });
      logActivity({
        actor,
        entity: "product",
        entity_id: product.id,
        action: "stock-adjusted",
        summary: `Adjusted stock for ${product.name}`,
        detail: `${product.stock} → ${next}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stock update failed";
      setError(message);
      toast.error("Stock update failed", message);
      load();
    }
  }

  async function handleDelete() {
    if (!removing) return;
    try {
      await deleteProduct(removing.id);
      toast.success("Product deleted", `${removing.name} was removed.`);
      logActivity({
        actor,
        entity: "product",
        entity_id: removing.id,
        action: "deleted",
        summary: `Deleted product ${removing.name}`,
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
        title="Inventory"
        subtitle={`${products.length} product${products.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-2">
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
              onClick={() => setEditing("new")}
              className="btn-primary flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm hover:btn-primary-hover"
            >
              <IconPlus size={15} />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat label="Stock Value (cost)" value={formatMoney(summary.value)} />
          <Stat
            label="Low Stock"
            value={String(summary.lowCount)}
            tone={summary.lowCount > 0 ? "amber" : "default"}
          />
          <Stat
            label="Out of Stock"
            value={String(summary.outCount)}
            tone={summary.outCount > 0 ? "rose" : "default"}
          />
        </div>

        <div className="overflow-hidden card">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconBox size={22} />}
              title="No products found"
              detail="Try a different search, or add your first product."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium">Price</th>
                      <th className="px-5 py-3 font-medium">Stock</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((product) => {
                      const level = stockLevel(product);
                      return (
                        <tr
                          key={product.id}
                          className="row-hover hover:bg-background"
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted">
                                {product.sku}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">{product.category}</td>
                          <td className="px-5 py-3.5 tabular-nums">
                            {formatMoney(Number(product.price))}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => adjustStock(product, -1)}
                                className="grid h-6 w-6 place-items-center rounded-md border border-line text-xs transition hover:bg-background active:scale-95"
                              >
                                −
                              </button>
                              <span className="w-8 text-center tabular-nums">
                                {product.stock}
                              </span>
                              <button
                                onClick={() => adjustStock(product, 1)}
                                className="grid h-6 w-6 place-items-center rounded-md border border-line text-xs transition hover:bg-background active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStyles[level]}`}
                            >
                              {stockLabels[level]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditing(product)}
                                className="btn-ghost px-3 py-1 text-xs hover:bg-background"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setRemoving(product)}
                                className="rounded-lg border border-rose-200 px-3 py-1 text-xs text-rose-700 transition hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <ul className="divide-y divide-line sm:hidden">
                {visible.map((product) => {
                  const level = stockLevel(product);
                  return (
                    <li key={product.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="text-xs text-muted">
                            {product.category}
                            {product.sku ? ` · ${product.sku}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStyles[level]}`}
                        >
                          {stockLabels[level]}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(Number(product.price))}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => adjustStock(product, -1)}
                            className="grid h-7 w-7 place-items-center rounded-md border border-line text-sm active:scale-95"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm tabular-nums">
                            {product.stock}
                          </span>
                          <button
                            onClick={() => adjustStock(product, 1)}
                            className="grid h-7 w-7 place-items-center rounded-md border border-line text-sm active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => setEditing(product)}
                          className="btn-ghost flex-1 py-1.5 text-xs active:bg-background"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setRemoving(product)}
                          className="flex-1 rounded-lg border border-rose-200 py-1.5 text-xs text-rose-700 active:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </main>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            const wasNew = editing === "new";
            setEditing(null);
            load();
            toast.success(wasNew ? "Product added" : "Product updated");
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Delete product?"
          message={
            <>
              <span className="font-medium text-foreground">
                {removing.name}
              </span>{" "}
              will be permanently removed from your inventory.
            </>
          }
          confirmLabel="Delete product"
          onClose={() => setRemoving(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
      ? "text-rose-700"
      : "text-foreground";
  return (
    <div className="card px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl ${toneClass}`}
      >
        {value}
      </p>
    </div>
  );
}
