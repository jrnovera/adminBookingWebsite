"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import { signUpAsStaff } from "@/lib/accounts";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      // Goes through an Edge Function rather than the client's own
      // auth.signUp() — that path emails a confirmation link this project
      // can't actually send (no SMTP configured), which left every earlier
      // signup attempt stuck unconfirmed forever. This creates the account
      // already confirmed, landed as 'staff' and pending a superadmin's
      // approval before it can sign in.
      await signUpAsStaff(email, password);
      setNotice(
        "Account created. A superadmin needs to approve it before you can sign in — check back soon."
      );
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Set up access to the admin dashboard"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-dark underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted">
            Password
          </span>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40 focus:ring-4 focus:ring-foreground/[0.06]"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2.5 text-sm hover:btn-primary-hover disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
