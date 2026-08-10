"use client";

import { useState } from "react";
import Modal from "./Modal";
import {
  createServiceCategory,
  updateServiceCategory,
} from "@/lib/serviceCatalog";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import type { ServiceCategory } from "@/lib/types";

export default function ServiceCategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: ServiceCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [nameAr, setNameAr] = useState(category?.name_ar ?? "");
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(category?.sort_order ?? "0")
  );
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const actor = session?.user.email ?? null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      image_url: imageUrl.trim() || null,
      sort_order: Math.round(Number(sortOrder) || 0),
      active,
    };

    try {
      if (category) await updateServiceCategory(category.id, payload);
      else await createServiceCategory(payload);
      logActivity({
        actor,
        entity: "service_category",
        entity_id: category?.id ?? null,
        action: category ? "edited" : "created",
        summary: `${category ? "Edited" : "Added"} category ${payload.name}`,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={category ? "Edit category" : "Add category"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Name" value={name} onChange={setName} required />
        <Field
          label="Name (Arabic)"
          value={nameAr}
          onChange={setNameAr}
        />
        <Field
          label="Image URL"
          value={imageUrl}
          onChange={setImageUrl}
          placeholder="https://…"
        />
        <Field
          label="Sort order"
          value={sortOrder}
          onChange={setSortOrder}
          type="number"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active (visible on booking site)
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
