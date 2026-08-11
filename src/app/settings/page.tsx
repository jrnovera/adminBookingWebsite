"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import {
  fetchSettings,
  saveSettings,
  updateEmail,
  updatePassword,
} from "@/lib/settings";
import { uploadImage } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from "@/lib/push";
import { formatMinutes } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";

export default function SettingsPage() {
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const { reload } = useShop();

  const [shopName, setShopName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [taxRate, setTaxRate] = useState("5");
  const [openMinutes, setOpenMinutes] = useState(9 * 60);
  const [closeMinutes, setCloseMinutes] = useState(18 * 60);
  const [hasBreak, setHasBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(13 * 60);
  const [breakEnd, setBreakEnd] = useState(14 * 60);
  const [homeServiceEnabled, setHomeServiceEnabled] = useState(false);
  const [homeServiceFee, setHomeServiceFee] = useState("0");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [shopStatus, setShopStatus] = useState<Status>(null);

  const [pushStatus, setPushStatus] = useState<PushStatus>("not-subscribed");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    getPushStatus().then(setPushStatus, () => setPushStatus("unsupported"));
  }, []);

  async function handleEnablePush() {
    if (!session?.user.id) return;
    setPushBusy(true);
    setPushError(null);
    try {
      await subscribeToPush(session.user.id);
      setPushStatus("subscribed");
      logActivity({
        actor,
        entity: "settings",
        action: "edited",
        summary: "Enabled push notifications on this device",
      });
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Could not enable notifications"
      );
      setPushStatus(await getPushStatus());
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      await unsubscribeFromPush();
      setPushStatus("not-subscribed");
      logActivity({
        actor,
        entity: "settings",
        action: "edited",
        summary: "Disabled push notifications on this device",
      });
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Could not disable notifications"
      );
    } finally {
      setPushBusy(false);
    }
  }

  // null until edited, so the signed-in address shows without an effect.
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  useEffect(() => {
    fetchSettings().then(
      (row) => {
        if (row) {
          setShopName(row.shop_name);
          setLogoUrl(row.logo_url);
          setEmail(row.email ?? "");
          setPhone(row.phone ?? "");
          setAddress(row.address ?? "");
          setCurrency(row.currency);
          setTaxRate(String(row.tax_rate));
          setOpenMinutes(row.open_minutes ?? 9 * 60);
          setCloseMinutes(row.close_minutes ?? 18 * 60);
          const hasStoredBreak =
            row.break_start_minutes != null && row.break_end_minutes != null;
          setHasBreak(hasStoredBreak);
          if (hasStoredBreak) {
            setBreakStart(row.break_start_minutes as number);
            setBreakEnd(row.break_end_minutes as number);
          }
          setHomeServiceEnabled(row.home_service_enabled ?? false);
          setHomeServiceFee(String(row.home_service_fee ?? 0));
        }
        setLoading(false);
      },
      (err: unknown) => {
        setShopStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load",
        });
        setLoading(false);
      }
    );
  }, []);

  async function saveShop(event: React.FormEvent) {
    event.preventDefault();
    setShopStatus(null);
    try {
      await saveSettings({
        shop_name: shopName.trim(),
        logo_url: logoUrl,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        currency: currency.trim() || "AED",
        tax_rate: Number(taxRate) || 0,
        open_minutes: openMinutes,
        close_minutes: closeMinutes,
        break_start_minutes: hasBreak ? breakStart : null,
        break_end_minutes: hasBreak ? breakEnd : null,
        home_service_enabled: homeServiceEnabled,
        home_service_fee: Math.max(0, Number(homeServiceFee) || 0),
      });
      reload();
      setShopStatus({ kind: "ok", message: "Business details saved." });
      logActivity({
        actor,
        entity: "settings",
        action: "edited",
        summary: "Updated business settings",
        detail: `Hours ${formatMinutes(openMinutes)}–${formatMinutes(
          closeMinutes
        )}${
          hasBreak
            ? ` · Break ${formatMinutes(breakStart)}–${formatMinutes(breakEnd)}`
            : ""
        } · Tax ${taxRate}% · Home service ${
          homeServiceEnabled ? `on (${homeServiceFee})` : "off"
        }`,
      });
    } catch (err) {
      setShopStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  const accountEmail = emailDraft ?? session?.user.email ?? "";

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    setEmailStatus(null);
    try {
      await updateEmail(accountEmail.trim());
      setEmailStatus({
        kind: "ok",
        message: "Check your inbox to confirm the new address.",
      });
      logActivity({
        actor,
        entity: "settings",
        action: "edited",
        summary: "Requested account email change",
        detail: accountEmail.trim(),
      });
    } catch (err) {
      setEmailStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordStatus(null);

    if (password !== confirm) {
      setPasswordStatus({ kind: "error", message: "Passwords do not match." });
      return;
    }

    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setPasswordStatus({ kind: "ok", message: "Password updated." });
      logActivity({
        actor,
        entity: "settings",
        action: "edited",
        summary: "Changed account password",
      });
    } catch (err) {
      setPasswordStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Business and account configuration" />

      <main className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <Section
            title="Business information"
            description="Shown on your booking page and receipts."
          >
            <form onSubmit={saveShop} className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Shop logo"
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-background text-xl">
                    ✦
                  </span>
                )}
                <div>
                  <label className="btn-ghost inline-block cursor-pointer px-3 py-1.5 text-xs hover:bg-background">
                    {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        setShopStatus(null);
                        try {
                          setLogoUrl(await uploadImage("shop-assets", file));
                        } catch (err) {
                          setShopStatus({
                            kind: "error",
                            message:
                              err instanceof Error
                                ? err.message
                                : "Upload failed",
                          });
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="ml-2 text-xs text-rose-700 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <Field label="Shop name" value={shopName} onChange={setShopName} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact email" value={email} onChange={setEmail} type="email" />
                <Field label="Phone" value={phone} onChange={setPhone} />
              </div>
              <Field label="Address" value={address} onChange={setAddress} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" value={currency} onChange={setCurrency} />
                <Field label="Tax rate (%)" value={taxRate} onChange={setTaxRate} type="number" />
              </div>

              <div className="border-t border-line pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                  Home service
                </p>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={homeServiceEnabled}
                    onChange={(e) => setHomeServiceEnabled(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Let clients book a visit at their own address
                </label>
                {homeServiceEnabled && (
                  <div className="mt-3 sm:max-w-[50%]">
                    <Field
                      label={`Call-out fee (${currency})`}
                      value={homeServiceFee}
                      onChange={setHomeServiceFee}
                      type="number"
                    />
                    <p className="mt-1.5 text-xs text-muted">
                      Added to every home booking, before tax. Set 0 to charge
                      nothing extra.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-line pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                  Opening hours
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TimeSelect
                    label="Opens at"
                    value={openMinutes}
                    onChange={(next) => {
                      setOpenMinutes(next);
                      if (next >= closeMinutes) {
                        setCloseMinutes(Math.min(next + 60, 1440));
                      }
                    }}
                  />
                  <TimeSelect
                    label="Closes at"
                    value={closeMinutes}
                    onChange={setCloseMinutes}
                    min={openMinutes + 15}
                  />
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hasBreak}
                    onChange={(event) => setHasBreak(event.target.checked)}
                  />
                  Daily break (staff unavailable, e.g. lunch)
                </label>

                {hasBreak && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <TimeSelect
                      label="Break starts"
                      value={breakStart}
                      onChange={(next) => {
                        setBreakStart(next);
                        if (next >= breakEnd) {
                          setBreakEnd(Math.min(next + 60, 1440));
                        }
                      }}
                    />
                    <TimeSelect
                      label="Break ends"
                      value={breakEnd}
                      onChange={setBreakEnd}
                      min={breakStart + 15}
                    />
                  </div>
                )}
              </div>

              <Status status={shopStatus} />
              <button className="btn-primary w-full px-5 py-2.5 text-sm hover:btn-primary-hover sm:w-auto">
                Save changes
              </button>
            </form>
          </Section>
        )}

        <Section
          title="Push notifications"
          description="Get an alert on this device for new bookings — even when the dashboard isn't open."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  pushStatus === "subscribed"
                    ? "bg-emerald-500"
                    : pushStatus === "denied"
                    ? "bg-rose-500"
                    : "bg-foreground/20"
                }`}
              />
              <p className="text-sm">
                {pushStatus === "unsupported" &&
                  "This browser doesn't support push notifications."}
                {pushStatus === "denied" &&
                  "Blocked — allow notifications for this site in your browser settings, then reload."}
                {pushStatus === "not-subscribed" &&
                  "Notifications are off on this device."}
                {pushStatus === "subscribed" &&
                  "Notifications are on for this device."}
              </p>
            </div>

            {pushStatus === "subscribed" ? (
              <button
                onClick={handleDisablePush}
                disabled={pushBusy}
                className="btn-ghost px-4 py-2 text-sm hover:bg-background disabled:opacity-60"
              >
                {pushBusy ? "Turning off…" : "Turn off"}
              </button>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={pushBusy || pushStatus === "unsupported" || pushStatus === "denied"}
                className="btn-primary px-4 py-2 text-sm hover:btn-primary-hover disabled:opacity-50"
              >
                {pushBusy ? "Turning on…" : "Turn on"}
              </button>
            )}
          </div>
          {pushError && <p className="mt-3 text-sm text-rose-700">{pushError}</p>}
        </Section>

        <Section
          title="Account email"
          description="Used to sign in to this dashboard."
        >
          <form onSubmit={saveEmail} className="space-y-4">
            <Field
              label="Email"
              value={accountEmail}
              onChange={setEmailDraft}
              type="email"
              required
            />
            <Status status={emailStatus} />
            <button className="btn-primary w-full px-5 py-2.5 text-sm hover:btn-primary-hover sm:w-auto">
              Update email
            </button>
          </form>
        </Section>

        <Section title="Password" description="Use at least 6 characters.">
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="New password"
                value={password}
                onChange={setPassword}
                type="password"
                required
              />
              <Field
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                type="password"
                required
              />
            </div>
            <Status status={passwordStatus} />
            <button className="btn-primary w-full px-5 py-2.5 text-sm hover:btn-primary-hover sm:w-auto">
              Update password
            </button>
          </form>
        </Section>
      </main>
    </>
  );
}

type Status = { kind: "ok" | "error"; message: string } | null;

function Status({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      className={`text-sm ${
        status.kind === "ok" ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      {status.message}
    </p>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card max-w-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-5 mt-0.5 text-sm text-muted">{description}</p>
      {children}
    </section>
  );
}

function TimeSelect({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const options = Array.from({ length: (24 * 60) / 15 + 1 }, (_, i) => i * 15)
    .filter((minutes) => minutes >= min)
    .filter((minutes) => minutes <= 24 * 60);

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      >
        {options.map((minutes) => (
          <option key={minutes} value={minutes}>
            {formatMinutes(minutes === 24 * 60 ? 0 : minutes)}
          </option>
        ))}
      </select>
    </label>
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-foreground"
      />
    </label>
  );
}
