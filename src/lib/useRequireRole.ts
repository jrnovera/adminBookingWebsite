"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth";
import { usePageVisibility } from "./pageVisibility";

/**
 * Redirects away from a page the current role shouldn't reach — the actual
 * gate a staff account hitting the URL directly, not just the hidden nav
 * link (see navConfig.tsx's `restrictedFrom`, which only hides the link).
 *
 * Waits for the role fetch to settle before deciding, so an admin/superadmin
 * never gets bounced during the brief window before their role loads. Also
 * waits for page_visibility to settle, and — regardless of `blockStaff`/
 * `superadminOnly` — redirects if the developer has hidden the *current*
 * page from this role there, so hiding a sidebar link is a real gate, not
 * just cosmetic for someone who still has (or guesses) the URL. The
 * developer itself is exempt from every check here, same as the nav.
 */
export function useRequireRole(options: {
  /** Redirect staff away from this page. */
  blockStaff?: boolean;
  /** Only the superadmin (and developer) may see this page. */
  superadminOnly?: boolean;
}) {
  const { role, isSuperAdmin, isDeveloper, roleLoading } = useAuth();
  const { visibility, loading: visibilityLoading } = usePageVisibility();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (roleLoading || visibilityLoading) return;
    if (isDeveloper) return;
    // Every branch below redirects to '/' — never block that route itself,
    // or a hidden Dashboard would send someone into a redirect loop.
    if (pathname === "/") return;

    if (options.superadminOnly && !isSuperAdmin) {
      router.replace("/");
      return;
    }
    if (options.blockStaff && role === "staff") {
      router.replace("/");
      return;
    }

    const dynamic = visibility[pathname];
    if (!dynamic) return;
    if (role === "staff" && dynamic.hiddenFromStaff) {
      router.replace("/");
      return;
    }
    if (role && role !== "staff" && dynamic.hiddenFromAdmin) {
      router.replace("/");
    }
  }, [
    roleLoading,
    visibilityLoading,
    role,
    isSuperAdmin,
    isDeveloper,
    visibility,
    pathname,
    options.blockStaff,
    options.superadminOnly,
    router,
  ]);
}
