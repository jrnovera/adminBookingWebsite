"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ProductForm from "@/components/ProductForm";
import {
  deleteProduct,
  fetchProducts,
  stockLabels,
  stockLevel,
  stockStyles,
  updateProduct,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock update failed");
      load();
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete ${product.name}?`)) return;
    try {
      await deleteProduct(product.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} product${products.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="w-52 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              onClick={() => setEditing("new")}
              className="btn-primary px-4 py-2 text-sm hover:opacity-90"
            >
              + Add Product
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-6">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Stock Value (cost)" value={formatMoney(summary.value)} />
          <Stat label="Low Stock" value={String(summary.lowCount)} />
          <Stat label="Out of Stock" value={String(summary.outCount)} />
        </div>

        <div className="overflow-hidden card">
          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">
              No products found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.map((product) => {
                    const level = stockLevel(product);
                    return (
                      <tr key={product.id} className="hover:bg-background">
                        <td className="px-5 py-3">
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted">
                              {product.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">{product.category}</td>
                        <td className="px-5 py-3">
                          {formatMoney(Number(product.price))}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustStock(product, -1)}
                              className="h-6 w-6 rounded border border-line text-xs hover:bg-background"
                            >
                              −
                            </button>
                            <span className="w-8 text-center">
                              {product.stock}
                            </span>
                            <button
                              onClick={() => adjustStock(product, 1)}
                              className="h-6 w-6 rounded border border-line text-xs hover:bg-background"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStyles[level]}`}
                          >
                            {stockLabels[level]}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditing(product)}
                              className="btn-ghost px-3 py-1 text-xs hover:bg-background"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="rounded-lg border border-rose-200 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
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
          )}
        </div>
      </main>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
