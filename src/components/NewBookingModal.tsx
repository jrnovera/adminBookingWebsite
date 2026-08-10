"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createBooking } from "@/lib/bookings";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { formatDateLong, formatMinutes } from "@/lib/format";
import { services } from "@/lib/services";
import { useShop } from "@/lib/shop";
import type { Staff } from "@/lib/types";

export default function NewBookingModal({
  staff,
  defaultStaffId,
  defaultDate,
  defaultMinutes,
  onClose,
  onCreated,
}: {
  staff: Staff[];
  defaultStaffId: string | null;
  defaultDate: string;
  defaultMinutes: number;
  onClose: () => void;
  onCreated: (created: {
    clientName: string;
    serviceName: string;
    staffName: string;
    date: string;
    time: string;
  }) => void;
}) {
  const { settings } = useShop();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const [serviceId, setServiceId] = useState(services[0].id);
  const [staffId, setStaffId] = useState(defaultStaffId ?? staff[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(formatMinutes(defaultMinutes));
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [markPaid, setMarkPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const service = services.find((item) => item.id === serviceId) ?? services[0];
  const member = staff.find((item) => item.id === staffId);
  const currency = settings?.currency ?? "AED";
  const taxRate = Number(settings?.tax_rate ?? 5) / 100;
  const subtotal = service.price;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!member) {
      setError("Pick a staff member.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const bookingId = await createBooking({
        service_id: service.id,
        service_name: service.name,
        duration_minutes: service.duration,
        price: service.price,
        staff_id: member.id,
        staff_name: member.name,
        booking_date: date,
        booking_time: time,
        subtotal,
        tax,
        total,
        currency,
        full_name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        notes: notes.trim() || null,
        status: "confirmed",
        is_paid: markPaid,
      });
      logActivity({
        actor,
        entity: "booking",
        entity_id: bookingId,
        action: "created",
        summary: `Created appointment for ${fullName.trim()}`,
        detail: `${service.name} · ${member.name} · ${formatDateLong(
          date
        )} ${time}`,
      });
      onCreated({
        clientName: fullName.trim(),
        serviceName: service.name,
        staffName: member.name,
        date,
        time,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create booking");
      setBusy(false);
    }
  }

  return (
    <Modal title="New appointment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Select
          label="Service"
          value={serviceId}
          onChange={setServiceId}
          options={services.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.duration}min · ${currency} ${item.price}`,
          }))}
        />

        <Select
          label="Staff"
          value={staffId}
          onChange={setStaffId}
          options={staff.map((item) => ({
            value: item.id,
            label: `${item.name} — ${item.role}`,
          }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Text label="Date" value={date} onChange={setDate} type="date" required />
          <Text label="Time" value={time} onChange={setTime} required />
        </div>

        <Text label="Client name" value={fullName} onChange={setFullName} required />
        <div className="grid grid-cols-2 gap-3">
          <Text label="Email" value={email} onChange={setEmail} type="email" required />
          <Text label="Mobile" value={mobile} onChange={setMobile} required />
        </div>
        <Text label="Notes" value={notes} onChange={setNotes} />

        <div className="rounded-xl bg-background px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>
              {currency} {subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              Tax ({settings?.tax_rate ?? 5}%)
            </span>
            <span>
              {currency} {tax.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
            <span>Total</span>
            <span>
              {currency} {total.toFixed(2)}
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markPaid}
            onChange={(event) => setMarkPaid(event.target.checked)}
          />
          Mark as paid
        </label>

        {error && <p className="text-sm text-rose-700">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create appointment"}
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
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
