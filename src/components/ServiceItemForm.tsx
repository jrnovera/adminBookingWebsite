"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createCatalogService, updateCatalogService } from "@/lib/serviceCatalog";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import type { Service, ServiceCategory } from "@/lib/types";

export default function ServiceItemForm({
  service,
  categories,
  defaultIsPackage,
  onClose,
  onSaved,
}: {
  service: Service | null;
  categories: ServiceCategory[];
  defaultIsPackage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [nameAr, setNameAr] = useState(service?.name_ar ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    service?.category_id ?? categories[0]?.id ?? ""
  );
  const [duration, setDuration] = useState(
    String(service?.duration_minutes ?? "30")
  );
  const [price, setPrice] = useState(String(service?.price ?? "0"));
  const [imageUrl, setImageUrl] = useState(service?.image_url ?? "");
  const [isPackage, setIsPackage] = useState(
    service?.is_package ?? defaultIsPackage
  );
  const [sortOrder, setSortOrder] = useState(
    String(service?.sort_order ?? "0")
  );
  const [active, setActive] = useState(service?.active ?? true);
  const [availableAt, setAvailableAt] = useState(service?.available_at ?? "both");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const actor = session?.user.email ?? null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      category_id: categoryId || null,
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      description: description.trim() || null,
      duration_minutes: Math.max(0, Math.round(Number(duration) || 0)),
      price: Number(price) || 0,
      image_url: imageUrl.trim() || null,
      is_package: isPackage,
      active,
      sort_order: Math.round(Number(sortOrder) || 0),
      available_at: availableAt,
    };

    try {
      if (service) await updateCatalogService(service.id, payload);
      else await createCatalogService(payload);
      logActivity({
        actor,
        entity: "service",
        entity_id: service?.id ?? null,
        action: service ? "edited" : "created",
        summary: `${service ? "Edited" : "Added"} ${
          isPackage ? "package" : "service"
        } ${payload.name}`,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <Modal
      title={
        service
          ? `Edit ${service.is_package ? "package" : "service"}`
          : isPackage
          ? "Add package"
          : "Add service"
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <TypeToggle
            label="Service"
            active={!isPackage}
            onClick={() => setIsPackage(false)}
          />
          <TypeToggle
            label="Package"
            active={isPackage}
            onClick={() => setIsPackage(true)}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Bookable at
          </span>
          <select
            value={availableAt}
            onChange={(event) =>
              setAvailableAt(event.target.value as typeof availableAt)
            }
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-foreground"
          >
            <option value="both">Salon and home</option>
            <option value="salon">Salon only</option>
            <option value="home">Home service only</option>
          </select>
        </label>

        <Field label="Name" value={name} onChange={setName} required />
        <Field label="Name (Arabic)" value={nameAr} onChange={setNameAr} />

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Category
          </span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Duration (min)"
            value={duration}
            onChange={setDuration}
            type="number"
            required
          />
          <Field
            label="Price"
            value={price}
            onChange={setPrice}
            type="number"
            required
          />
        </div>

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
          Active (bookable on booking site)
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

function TypeToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-foreground bg-foreground text-surface"
          : "border-line text-muted hover:bg-background"
      }`}
    >
      {label}
    </button>
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
        step={type === "number" ? "0.01" : undefined}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
