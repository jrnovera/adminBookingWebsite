// Superadmin is an app-level allowlist by email, not a database role — this
// codebase already trusts every authenticated admin equally at the RLS layer
// (see e.g. "Admins delete bookings" / "Admins manage staff": `for ... to
// authenticated using (true)`), so this gate only controls what the UI
// exposes. A signed-in admin who isn't superadmin simply never sees the
// destructive actions; it is not a substitute for row-level security against
// a hostile authenticated user with direct API access.
const SUPERADMIN_EMAILS = ["admin@gmail.com"];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.includes(email.toLowerCase());
}
