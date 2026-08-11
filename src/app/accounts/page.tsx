"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { IconUsers } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useRequireRole } from "@/lib/useRequireRole";
import {
  createAccount,
  fetchUserAccounts,
  updateAccount,
  type UserAccount,
} from "@/lib/accounts";
import type { UserRole } from "@/lib/roles";

const roleLabels: Record<UserRole, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Superadmin",
};

export default function AccountsPage() {
  useRequireRole({ superadminOnly: true });
  const toast = useToast();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchUserAccounts().then(
      (data) => {
        setAccounts(data);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load accounts");
        setLoading(false);
      }
    );
  }, []);

  useEffect(load, [load]);

  async function handleApprove(account: UserAccount) {
    setBusyId(account.user_id);
    try {
      await updateAccount(account.user_id, { approved: true });
      toast.success("Approved", `${account.email} can now sign in.`);
      load();
    } catch (err) {
      toast.error("Approval failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(account: UserAccount, role: UserRole) {
    setBusyId(account.user_id);
    try {
      await updateAccount(account.user_id, { role });
      toast.success("Role updated", `${account.email} is now ${roleLabels[role]}.`);
      load();
    } catch (err) {
      toast.error("Update failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusyId(null);
    }
  }

  const pending = accounts.filter((a) => !a.approved);
  const approved = accounts.filter((a) => a.approved);

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · superadmin only`}
      />

      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {error && <ErrorBanner message={error} />}

        <CreateAccountCard onCreated={load} />

        {!loading && pending.length > 0 && (
          <section className="card overflow-hidden border-amber-200">
            <h2 className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">
              Waiting for approval ({pending.length})
            </h2>
            <ul className="divide-y divide-line">
              {pending.map((account) => (
                <li
                  key={account.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{account.email}</p>
                    <p className="text-xs text-muted">
                      Signed up as {roleLabels[account.role]}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApprove(account)}
                    disabled={busyId === account.user_id}
                    className="btn-primary px-4 py-2 text-sm hover:btn-primary-hover disabled:opacity-50"
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">
            All accounts
          </h2>
          {loading ? (
            <p className="px-5 py-8 text-sm text-muted">Loading…</p>
          ) : approved.length === 0 ? (
            <EmptyState
              icon={<IconUsers size={22} />}
              title="No approved accounts yet"
              detail="Create one below, or wait for a signup to approve."
            />
          ) : (
            <ul className="divide-y divide-line">
              {approved.map((account) => (
                <li
                  key={account.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <p className="min-w-0 truncate font-medium">{account.email}</p>
                  <select
                    value={account.role}
                    disabled={busyId === account.user_id}
                    onChange={(event) =>
                      handleRoleChange(account, event.target.value as UserRole)
                    }
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none disabled:opacity-50"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function CreateAccountCard({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAccount({ email: email.trim(), password, role });
      toast.success("Account created", `${email.trim()} can sign in immediately.`);
      setEmail("");
      setPassword("");
      setRole("staff");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">Create an account</h2>
      <p className="mt-1 text-xs text-muted">
        Skips the approval queue — the account can sign in right away, at
        whatever role you pick.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-4">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground sm:col-span-2"
        />
        <input
          required
          minLength={6}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
        {error && (
          <p className="text-sm text-rose-700 sm:col-span-4">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary px-4 py-2 text-sm hover:btn-primary-hover disabled:opacity-60 sm:col-span-4"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
