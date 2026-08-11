// Edge Function: self-signup
//
// Public counterpart to create-account: anyone can call this (no auth
// header needed — that's the point, it's how a brand-new user gets an
// account at all), but unlike create-account it can only ever produce a
// 'staff' account with approved = false. Nobody can sign themselves up as
// admin or superadmin, and nobody can sign themselves up with instant
// access — a superadmin has to flip `approved` to true from the Accounts
// screen before the account can do anything (see is_superadmin() and
// AppShell's isPendingApproval gate, which both key off the approved column).
//
// Uses the Admin API (service role, auto-injected) to create the account
// already email-confirmed, same reasoning as create-account: this project
// has no SMTP configured, so the normal client-side signUp()'s confirmation
// email never arrives and the account would be stuck unconfirmed forever.
//
// Deploy: supabase functions deploy self-signup --no-verify-jwt
// (--no-verify-jwt because this must be callable while signed out)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// See create-account/index.ts for why this is needed — same reasoning here.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  if (!email || !email.includes("@")) {
    return json({ error: "Invalid email" }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters" }, 400);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Could not create account" }, 400);
  }

  const { error: roleError } = await adminClient
    .from("user_roles")
    .insert({ user_id: created.user.id, role: "staff", approved: false });

  if (roleError) {
    return json(
      { error: `Account created but could not be queued for approval: ${roleError.message}` },
      500
    );
  }

  return json({ email, pending: true });
});
