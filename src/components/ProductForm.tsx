"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createProduct, updateProduct } from "@/lib/inventory";
import type { Product } from "@/lib/types";

export default function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState(product?.category ?? "Retail");
  const [price, setPrice] = useState(String(product?.price ?? "0"));
  const [cost, setCost] = useState(String(product?.cost ?? "0"));
  const [stock, setStock] = useState(String(product?.stock ?? "0"));
  const [lowStockAt, setLowStockAt] = useState(
    String(product?.low_stock_at ?? "5")
  );
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      category: category.trim() || "Retail",
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      stock: Math.max(0, Math.round(Number(stock) || 0)),
      low_stock_at: Math.max(0, Math.round(Number(lowStockAt) || 0)),
      active,
    };

    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <Modal title={product ? "Edit product" : "Add product"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Name" value={name} onChange={setName} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" value={sku} onChange={setSku} />
          <Field label="Category" value={category} onChange={setCategory} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Price"
            value={price}
            onChange={setPrice}
            type="number"
            required
          />
          <Field
            label="Cost"
            value={cost}
            onChange={setCost}
            type="number"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Stock"
            value={stock}
            onChange={setStock}
            type="number"
            required
          />
          <Field
            label="Low stock at"
            value={lowStockAt}
            onChange={setLowStockAt}
            type="number"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-4 py-2.5 text-sm hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
