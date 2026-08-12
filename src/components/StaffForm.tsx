"use client";

import { useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";
import {
  createStaff,
  setStaffCategories,
  updateStaff,
  weekdayLabels,
} from "@/lib/staff";
import { uploadImage } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import type { ServiceCategory, Staff } from "@/lib/types";

export default function StaffForm({
  staff,
  categories,
  staffCategoryIds,
  onClose,
  onSaved,
}: {
  staff: Staff | null;
  /** Active categories, so the admin can tick which ones this person works
   * in — e.g. Hair, Nails, Massage. */
  categories: ServiceCategory[];
  /** This person's current expertise — empty/omitted means "no restriction
   * on file", not "offers nothing"; see supabase/021_staff_categories.sql. */
  staffCategoryIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState(staff?.role ?? "Stylist");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [active, setActive] = useState(staff?.active ?? true);
  const [workStart, setWorkStart] = useState(staff?.work_start ?? "09:00");
  const [workEnd, setWorkEnd] = useState(staff?.work_end ?? "18:00");
  const [daysOff, setDaysOff] = useState<number[]>(staff?.days_off ?? [0]);
  const [avatarUrl, setAvatarUrl] = useState(staff?.avatar_url ?? null);
  const [salaryType, setSalaryType] = useState<"monthly" | "hourly">(
    staff?.salary_type ?? "monthly"
  );
  const [baseSalary, setBaseSalary] = useState(
    String(staff?.base_salary ?? 0)
  );
  const [hourlyRate, setHourlyRate] = useState(
    String(staff?.hourly_rate ?? 0)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offeredCategoryIds, setOfferedCategoryIds] =
    useState<string[]>(staffCategoryIds);
  const { session } = useAuth();
  const actor = session?.user.email ?? null;

  function toggleDay(day: number) {
    setDaysOff((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort()
    );
  }

  function toggleCategory(categoryId: string) {
    setOfferedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: name.trim(),
      role: role.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      active,
      work_start: workStart,
      work_end: workEnd,
      days_off: daysOff,
      avatar_url: avatarUrl,
      salary_type: salaryType,
      base_salary: Math.max(0, Number(baseSalary) || 0),
      hourly_rate: Math.max(0, Number(hourlyRate) || 0),
    };

    try {
      const staffId = staff ? staff.id : await createStaff(payload);
      if (staff) await updateStaff(staff.id, payload);
      await setStaffCategories(staffId, offeredCategoryIds);
      logActivity({
        actor,
        entity: "staff",
        entity_id: staff?.id ?? null,
        action: staff ? "edited" : "created",
        summary: `${staff ? "Edited" : "Added"} team member ${payload.name}`,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <Modal title={staff ? "Edit staff" : "Add staff"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar name={name || "New"} src={avatarUrl} size={64} />
          <div>
            <label className="btn-ghost inline-block cursor-pointer px-3 py-1.5 text-xs hover:bg-background">
              {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setError(null);
                  try {
                    setAvatarUrl(await uploadImage("staff-photos", file));
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Upload failed"
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="ml-2 text-xs text-rose-700 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <Text label="Name" value={name} onChange={setName} required />
        <Text
          label="Duty / Role"
          value={role}
          onChange={setRole}
          required
          placeholder="Hair Stylist, Barber, Nail Technician…"
        />
        <Text label="Email" value={email} onChange={setEmail} type="email" />
        <Text label="Phone" value={phone} onChange={setPhone} />

        <div className="grid grid-cols-2 gap-3">
          <Text
            label="Starts"
            value={workStart}
            onChange={setWorkStart}
            type="time"
            required
          />
          <Text
            label="Ends"
            value={workEnd}
            onChange={setWorkEnd}
            type="time"
            required
          />
        </div>

        <div>
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Expertise
          </span>
          <p className="mb-1.5 text-xs text-muted">
            {offeredCategoryIds.length === 0
              ? "Nothing ticked yet — the booking site will offer this person for any service until you scope them below."
              : `Bookable for ${offeredCategoryIds.length} categor${
                  offeredCategoryIds.length === 1 ? "y" : "ies"
                } — only services in these will offer them as a staff choice on the booking site.`}
          </p>
          {categories.length === 0 ? (
            <p className="rounded-xl border border-line px-3 py-2.5 text-xs text-muted">
              No categories in the catalogue yet — add some under Services
              &amp; Packages first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    offeredCategoryIds.includes(category.id)
                      ? "bg-foreground text-white"
                      : "border border-line hover:bg-background"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted">
            Days off
          </span>
          <div className="flex flex-wrap gap-1.5">
            {weekdayLabels.map((label, day) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  daysOff.includes(day)
                    ? "bg-foreground text-white"
                    : "border border-line hover:bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted">
            Pay setup
          </span>
          <div className="flex gap-1.5">
            {(["monthly", "hourly"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSalaryType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                  salaryType === type
                    ? "bg-foreground text-white"
                    : "border border-line hover:bg-background"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="mt-2">
            {salaryType === "monthly" ? (
              <Text
                label="Monthly basic pay"
                value={baseSalary}
                onChange={setBaseSalary}
                type="number"
              />
            ) : (
              <Text
                label="Hourly rate"
                value={hourlyRate}
                onChange={setHourlyRate}
                type="number"
              />
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Used by Payroll to compute pay from Attendance — see the
            Attendance and Payroll pages.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active (bookable)
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

function Text({
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
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
