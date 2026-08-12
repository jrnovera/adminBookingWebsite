"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import ServiceItemForm from "@/components/ServiceItemForm";
import ServiceCategoryForm from "@/components/ServiceCategoryForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EmptyState, ErrorBanner, TableSkeleton } from "@/components/Feedback";
import { IconPencil, IconPlus, IconScissors, IconTag } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  deleteCatalogService,
  deleteServiceCategory,
  fetchCatalogServices,
  fetchServiceCategories,
  updateCatalogService,
} from "@/lib/serviceCatalog";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { Service, ServiceCategory } from "@/lib/types";
import { useRequireRole } from "@/lib/useRequireRole";

type Filter = "all" | "services" | "packages";
/** Where an item can be booked. "both" items show under salon *and* home,
 * since they genuinely are bookable either way. */
type LocationFilter = "all" | "salon" | "home";

export default function ServicesPage() {
  useRequireRole({ blockStaff: true });
  const toast = useToast();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [query, setQuery] = useState("");

  const [editingItem, setEditingItem] = useState<Service | "new-service" | "new-package" | null>(null);
  const [removingItem, setRemovingItem] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | "new" | null>(null);
  const [removingCategory, setRemovingCategory] = useState<ServiceCategory | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchServiceCategories(), fetchCatalogServices()]).then(
      ([cats, services]) => {
        setCategories(cats);
        setItems(services);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load services");
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? "Uncategorized" : "Uncategorized");
  }, [categories]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategory !== "all" && item.category_id !== activeCategory) return false;
      if (filter === "services" && item.is_package) return false;
      if (filter === "packages" && !item.is_package) return false;
      // "both" items belong to either list — they really are bookable both
      // ways, so filtering to salon must not hide them.
      if (locationFilter !== "all") {
        const at = item.available_at ?? "both";
        if (at !== "both" && at !== locationFilter) return false;
      }
      if (term && !item.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, activeCategory, filter, locationFilter, query]);

  async function toggleActive(item: Service) {
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, active: !row.active } : row
      )
    );
    try {
      await updateCatalogService(item.id, { active: !item.active });
      logActivity({
        actor,
        entity: "service",
        entity_id: item.id,
        action: item.active ? "hidden" : "activated",
        summary: `${item.active ? "Hid" : "Activated"} ${
          item.is_package ? "package" : "service"
        } ${item.name}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
      toast.error("Update failed", message);
      load();
    }
  }

  async function handleDeleteItem() {
    if (!removingItem) return;
    try {
      await deleteCatalogService(removingItem.id);
      toast.success(
        removingItem.is_package ? "Package deleted" : "Service deleted",
        removingItem.name
      );
      logActivity({
        actor,
        entity: "service",
        entity_id: removingItem.id,
        action: "deleted",
        summary: `Deleted ${removingItem.is_package ? "package" : "service"} ${removingItem.name}`,
      });
      setRemovingItem(null);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      toast.error("Delete failed", message);
    }
  }

  async function handleDeleteCategory() {
    if (!removingCategory) return;
    try {
      await deleteServiceCategory(removingCategory.id);
      toast.success("Category deleted", removingCategory.name);
      logActivity({
        actor,
        entity: "service_category",
        entity_id: removingCategory.id,
        action: "deleted",
        summary: `Deleted category ${removingCategory.name}`,
      });
      setRemovingCategory(null);
      if (activeCategory === removingCategory.id) setActiveCategory("all");
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
        title="Services & Packages"
        subtitle={`${items.length} item${items.length === 1 ? "" : "s"} · shown on the booking site`}
        action={
          // Labels stay visible on phones — three icon-only buttons in a row
          // are impossible to tell apart.
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManagingCategories(true)}
              className="btn-ghost flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm hover:bg-background"
            >
              <IconTag size={15} />
              Categories
            </button>
            <button
              onClick={() => setEditingItem("new-service")}
              className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm hover:btn-primary-hover sm:px-4"
            >
              <IconPlus size={15} />
              <span className="sm:hidden">Service</span>
              <span className="hidden sm:inline">Add Service</span>
            </button>
            <button
              onClick={() => setEditingItem("new-package")}
              className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm hover:btn-primary-hover sm:px-4"
            >
              <IconPlus size={15} />
              <span className="sm:hidden">Package</span>
              <span className="hidden sm:inline">Add Package</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="w-48 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
          />
          <div className="flex gap-1 rounded-xl border border-line p-1">
            {(["all", "services", "packages"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  filter === f ? "bg-foreground text-surface" : "text-muted hover:bg-background"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Where it can be booked — mirrors the Bookable-at field on the
              item form, so you can check the home menu at a glance. */}
          <div className="flex gap-1 rounded-xl border border-line p-1">
            {(["all", "salon", "home"] as LocationFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setLocationFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  locationFilter === f
                    ? "bg-foreground text-surface"
                    : "text-muted hover:bg-background"
                }`}
              >
                {f === "all" ? "Anywhere" : f === "salon" ? "In salon" : "Home"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeCategory === "all"
                ? "bg-foreground text-surface"
                : "border border-line text-muted hover:bg-background"
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeCategory === cat.id
                  ? "bg-foreground text-surface"
                  : "border border-line text-muted hover:bg-background"
              } ${cat.active ? "" : "opacity-50"}`}
              title={cat.active ? undefined : "Hidden on booking site"}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="overflow-hidden card">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<IconScissors size={22} />}
              title="No services yet"
              detail="Add a service or package to have it appear on the booking site."
            />
          ) : (
            <>
              {/* Phones get a card list; the 7-column table needs too much
                  width to stay legible at 375px. */}
              <ul className="divide-y divide-line sm:hidden">
                {visible.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1.5 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        <ServiceThumb src={item.image_url} />
                        <p className="min-w-0 flex-1 font-medium">{item.name}</p>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.is_package
                            ? "bg-violet-100 text-violet-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {item.is_package ? "Package" : "Service"}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {categoryName(item.category_id)} · {item.duration_minutes}{" "}
                      min · {formatMoney(Number(item.price))}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.active ? "Active" : "Hidden"}
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="btn-ghost px-3 py-1 text-xs hover:bg-background"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setRemovingItem(item)}
                        className="rounded-lg px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-2.5">
                          <ServiceThumb src={item.image_url} />
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{categoryName(item.category_id)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.is_package
                              ? "bg-violet-100 text-violet-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {item.is_package ? "Package" : "Service"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{item.duration_minutes} min</td>
                      <td className="px-4 py-3">{formatMoney(Number(item.price))}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.active ? "Active" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-background hover:text-foreground"
                            aria-label="Edit"
                          >
                            <IconPencil size={15} />
                          </button>
                          <button
                            onClick={() => setRemovingItem(item)}
                            className="rounded-lg px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </main>

      {editingItem && (
        <ServiceItemForm
          service={typeof editingItem === "string" ? null : editingItem}
          categories={categories}
          defaultIsPackage={editingItem === "new-package"}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            const wasNew = typeof editingItem === "string";
            setEditingItem(null);
            load();
            toast.success(wasNew ? "Saved" : "Updated");
          }}
        />
      )}

      {removingItem && (
        <ConfirmDialog
          title={`Delete ${removingItem.is_package ? "package" : "service"}?`}
          message={
            <>
              <span className="font-medium text-foreground">{removingItem.name}</span> will
              no longer be bookable on the booking site.
            </>
          }
          confirmLabel="Delete"
          onClose={() => setRemovingItem(null)}
          onConfirm={handleDeleteItem}
        />
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => setManagingCategories(false)}
          onAdd={() => setEditingCategory("new")}
          onEdit={(cat) => setEditingCategory(cat)}
          onRemove={(cat) => setRemovingCategory(cat)}
        />
      )}

      {editingCategory && (
        <ServiceCategoryForm
          category={editingCategory === "new" ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            load();
            toast.success("Category saved");
          }}
        />
      )}

      {removingCategory && (
        <ConfirmDialog
          title="Delete category?"
          message={
            <>
              <span className="font-medium text-foreground">{removingCategory.name}</span>{" "}
              will be removed. Services in it become uncategorized.
            </>
          }
          confirmLabel="Delete category"
          onClose={() => setRemovingCategory(null)}
          onConfirm={handleDeleteCategory}
        />
      )}
    </>
  );
}

function ServiceThumb({ src }: { src: string | null }) {
  if (!src) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-[9px] text-muted ring-1 ring-line">
        No photo
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={36}
      height={36}
      unoptimized
      className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-line"
    />
  );
}

function CategoryManager({
  categories,
  onClose,
  onAdd,
  onEdit,
  onRemove,
}: {
  categories: ServiceCategory[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (cat: ServiceCategory) => void;
  onRemove: (cat: ServiceCategory) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-xl)] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <h2 className="text-base font-semibold">Categories</h2>
          <button
            onClick={onAdd}
            className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            <IconPlus size={13} /> Add
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 sm:px-6">
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No categories yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cat.name}</p>
                    {!cat.active && (
                      <p className="text-xs text-muted">Hidden on booking site</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => onEdit(cat)}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-background hover:text-foreground"
                      aria-label="Edit"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      onClick={() => onRemove(cat)}
                      className="rounded-lg px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={onClose}
          className="btn-ghost mx-5 mb-5 py-2.5 text-sm hover:bg-background sm:mx-6"
        >
          Close
        </button>
      </div>
    </div>
  );
}
