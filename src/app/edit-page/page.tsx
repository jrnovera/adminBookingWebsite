"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { uploadImage } from "@/lib/storage";
import { useRequireRole } from "@/lib/useRequireRole";
import { useToast } from "@/components/Toast";
import {
  fetchPageImages,
  savePageImage,
  type PageImageKey,
} from "@/lib/pageImages";

/** One card per hero/banner slot on the public site, in page order. */
const SLOTS: { key: PageImageKey; label: string; description: string }[] = [
  {
    key: "home_hero",
    label: "Homepage Hero",
    description: "Full-width photo behind the headline on the homepage.",
  },
  {
    key: "about_hero",
    label: "About",
    description: "Banner photo at the top of the About page.",
  },
  {
    key: "services_hero",
    label: "Services",
    description: "Banner photo at the top of the Services page.",
  },
  {
    key: "team_hero",
    label: "Our Team",
    description: "Banner photo at the top of the Team page.",
  },
  {
    key: "reviews_hero",
    label: "Reviews",
    description: "Banner photo at the top of the Reviews page.",
  },
  {
    key: "blog_hero",
    label: "Blog",
    description: "Banner photo at the top of the Blog page.",
  },
  {
    key: "promos_hero",
    label: "Promos",
    description: "Banner photo at the top of the Promotions & Vouchers page.",
  },
  {
    key: "packages_hero",
    label: "Packages",
    description: "Banner photo at the top of the Packages page.",
  },
];

export default function EditPagePage() {
  useRequireRole({ blockStaff: true });
  const toast = useToast();

  const [images, setImages] = useState<Partial<Record<PageImageKey, string>>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<PageImageKey | null>(null);

  useEffect(() => {
    fetchPageImages()
      .then(setImages)
      .catch((err) => {
        toast.error(
          "Failed to load",
          err instanceof Error ? err.message : undefined
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(key: PageImageKey, file: File) {
    setUploadingKey(key);
    try {
      const url = await uploadImage("shop-assets", file);
      await savePageImage(key, url);
      setImages((prev) => ({ ...prev, [key]: url }));
      toast.success("Image updated", "The public site now uses this photo.");
    } catch (err) {
      toast.error(
        "Upload failed",
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleRemove(key: PageImageKey) {
    try {
      await savePageImage(key, null);
      setImages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Reverted to default photo");
    } catch (err) {
      toast.error(
        "Failed to revert",
        err instanceof Error ? err.message : undefined
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Edit Page"
        subtitle="Replace the hero photo shown at the top of each public page."
      />

      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {SLOTS.map((slot) => {
              const url = images[slot.key];
              const isUploading = uploadingKey === slot.key;
              return (
                <div key={slot.key} className="card overflow-hidden p-0">
                  <div className="relative aspect-[16/9] w-full bg-background">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted">
                        Using default photo
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="text-sm font-semibold">{slot.label}</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {slot.description}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <label className="btn-ghost inline-block cursor-pointer px-3 py-1.5 text-xs hover:bg-background">
                        {isUploading
                          ? "Uploading…"
                          : url
                            ? "Replace"
                            : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) handleUpload(slot.key, file);
                          }}
                        />
                      </label>
                      {url && (
                        <button
                          type="button"
                          onClick={() => handleRemove(slot.key)}
                          className="text-xs text-rose-700 hover:underline"
                        >
                          Revert to default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
