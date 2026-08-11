"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth";

/**
 * Redirects away from a page the current role shouldn't reach — the actual
 * gate a staff account hitting the URL directly, not just the hidden nav
 * link (see navConfig.tsx's `restrictedFrom`, which only hides the link).
 *
 * Waits for the role fetch to settle before deciding, so an admin/superadmin
 * never gets bounced during the brief window before their role loads.
 */
export function useRequireRole(options: {
  /** Redirect staff away from this page. */
  blockStaff?: boolean;
  /** Only the superadmin may see this page. */
  superadminOnly?: boolean;
}) {
  const { role, isSuperAdmin, roleLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (roleLoading) return;
    if (options.superadminOnly && !isSuperAdmin) {
      router.replace("/");
      return;
    }
    if (options.blockStaff && role === "staff") {
      router.replace("/");
    }
  }, [roleLoading, role, isSuperAdmin, options.blockStaff, options.superadminOnly, router]);
}
