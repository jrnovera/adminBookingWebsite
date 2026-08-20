"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { IconUsers, IconTrash, IconPencil } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { useRequireRole } from "@/lib/useRequireRole";
import {
  createAccount,
  fetchUserAccounts,
  updateAccount,
  deleteAccount,
  editAccount,
  type UserAccount,
} from "@/lib/accounts";
import type { UserRole } from "@/lib/roles";

const roleLabels: Record<UserRole, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Superadmin",
  // Not offered in the role <select> below — developer is granted directly
  // in the SQL editor (see 037_developer_role_and_page_visibility.sql), the
  // same way the very first superadmin is. Only here so this record stays
  // exhaustive over UserRole.
  developer: "Developer",
};

export default function AccountsPage() {
  useRequireRole({ superadminOnly: true });
  const toast = useToast();
  const { isDeveloper } = useAuth();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  async function handleDelete(account: UserAccount) {
    setBusyId(account.user_id);
    try {
      await deleteAccount(account.user_id);
      toast.success("Account deleted", `${account.email} has been removed.`);
      setDeleteConfirmId(null);
      load();
    } catch (err) {
      toast.error("Delete failed", err instanceof Error ? err.message : "Try again");
    } finally {
      setBusyId(null);
    }
  }

  // Developer accounts are invisible to everyone but another developer — a
  // superadmin shouldn't know the maintainer's login exists, let alone be
  // able to act on it. The list_user_accounts() RPC applies the same filter
  // server-side (see 039_hide_developer_accounts.sql); this keeps the count
  // and the rows consistent with what the caller is actually allowed to see.
  const visibleAccounts = isDeveloper
    ? accounts
    : accounts.filter((a) => a.role !== "developer");

  const pending = visibleAccounts.filter((a) => !a.approved);
  const approved = visibleAccounts.filter((a) => a.approved);

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle={`${visibleAccounts.length} account${visibleAccounts.length === 1 ? "" : "s"} · superadmin & developer only`}
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
                  {account.role === "developer" ? (
                    // Not editable from here: developer is granted and
                    // revoked in the SQL editor only (see
                    // 037_developer_role_and_page_visibility.sql), so a
                    // superadmin can't demote or delete it by mistake through
                    // this list.
                    <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted">
                      Developer
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
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
                      <button
                        onClick={() => setEditingId(account.user_id)}
                        disabled={busyId === account.user_id}
                        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                        title="Edit email/password"
                      >
                        <IconPencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(account.user_id)}
                        disabled={busyId === account.user_id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 text-sm hover:bg-rose-100 disabled:opacity-50"
                        title="Delete account"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {editingId && (
          <EditAccountModal
            account={visibleAccounts.find((a) => a.user_id === editingId)!}
            isOpen={true}
            onClose={() => setEditingId(null)}
            onSave={load}
            isBusy={busyId === editingId}
          />
        )}

        {deleteConfirmId && (
          <DeleteConfirmDialog
            account={visibleAccounts.find((a) => a.user_id === deleteConfirmId)!}
            isOpen={true}
            onConfirm={() => {
              const account = visibleAccounts.find((a) => a.user_id === deleteConfirmId)!;
              handleDelete(account);
            }}
            onCancel={() => setDeleteConfirmId(null)}
            isBusy={busyId === deleteConfirmId}
          />
        )}
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

function EditAccountModal({
  account,
  isOpen,
  onClose,
  onSave,
  isBusy,
}: {
  account: UserAccount;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isBusy: boolean;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const changes: { email?: string; password?: string } = {};
    if (email !== account.email) {
      changes.email = email.trim();
    }
    if (password) {
      changes.password = password;
    }

    if (!Object.keys(changes).length) {
      setError("No changes to save");
      setLoading(false);
      return;
    }

    try {
      await editAccount(account.user_id, changes);
      toast.success("Account updated", `${email} has been saved.`);
      onClose();
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-md w-full p-5">
        <h2 className="text-base font-semibold">Edit account</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-foreground disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Password (leave blank to keep current)
            </label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-foreground disabled:opacity-50"
            />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary px-3 py-2 text-sm hover:btn-primary-hover disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  account,
  isOpen,
  onConfirm,
  onCancel,
  isBusy,
}: {
  account: UserAccount;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card max-w-md w-full p-5 border-rose-200">
        <h2 className="text-base font-semibold text-rose-900">Delete account?</h2>
        <p className="mt-2 text-sm text-rose-800">
          This will permanently remove <strong>{account.email}</strong> and all access.
          This cannot be undone.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className="flex-1 bg-rose-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-rose-700 disabled:opacity-60"
          >
            {isBusy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
