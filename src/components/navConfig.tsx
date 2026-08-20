import {
  IconBox,
  IconCalendar,
  IconChart,
  IconClipboardCheck,
  IconClock,
  IconDashboard,
  IconImage,
  IconPieChart,
  IconRegister,
  IconScissors,
  IconSettings,
  IconTag,
  IconUsers,
  IconWallet,
} from "./Icons";
import type { UserRole } from "@/lib/roles";
import type { PageVisibilityMap } from "@/lib/pageVisibility";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
  /** Hidden from these roles until the developer's page_visibility table
   * loads (or if this item has no row there) — the starting point, not a
   * hard rule. See isVisible below for how the dynamic map overrides this. */
  restrictedFrom?: UserRole[];
  /** Visible only to the superadmin (which developer also counts as) —
   * separate from restrictedFrom/page_visibility because this is a security
   * boundary (account management), not a business-configurable toggle. */
  superadminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Grouped so the rail reads as three jobs — what's happening today, who we
 * serve, and what we manage — rather than one long undifferentiated list.
 */
export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: IconDashboard },
      { href: "/calendar", label: "Calendar", icon: IconCalendar },
      { href: "/appointments", label: "Appointments", icon: IconClock },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/clients", label: "Clients", icon: IconUsers },
      { href: "/pos", label: "Point of Sale", icon: IconRegister },
      { href: "/transactions", label: "Transactions", icon: IconChart },
      {
        href: "/reports",
        label: "Reports",
        icon: IconPieChart,
        restrictedFrom: ["staff"],
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        href: "/staff",
        label: "Team",
        icon: IconScissors,
        restrictedFrom: ["staff"],
      },
      {
        href: "/attendance",
        label: "Attendance",
        icon: IconClipboardCheck,
        restrictedFrom: ["staff"],
      },
      {
        href: "/payroll",
        label: "Payroll",
        icon: IconWallet,
        restrictedFrom: ["staff"],
      },
      {
        href: "/services",
        label: "Services & Packages",
        icon: IconTag,
        restrictedFrom: ["staff"],
      },
      { href: "/inventory", label: "Inventory", icon: IconBox },
      { href: "/promos", label: "Promos", icon: IconTag },
      {
        href: "/edit-page",
        label: "Edit Page",
        icon: IconImage,
        restrictedFrom: ["staff"],
      },
      {
        href: "/accounts",
        label: "Accounts",
        icon: IconUsers,
        superadminOnly: true,
      },
      {
        href: "/settings",
        label: "Settings",
        icon: IconSettings,
        restrictedFrom: ["staff"],
      },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

/** The items the developer's Page Visibility editor offers toggles for.
 * Excludes superadminOnly items (account management is a security boundary,
 * not a business-configurable toggle) and Dashboard ('/') — every guard
 * redirects back to '/' when it blocks a page, so letting '/' itself be
 * hidden would send a blocked role into a redirect loop. */
export const manageableNavItems: NavItem[] = navItems.filter(
  (item) => !item.superadminOnly && item.href !== "/"
);

function isVisible(
  item: NavItem,
  role: UserRole | null,
  isSuperAdmin: boolean,
  isDeveloper: boolean,
  visibility: PageVisibilityMap
): boolean {
  // The developer set these toggles — they always see what they're toggling.
  if (isDeveloper) return true;
  if (item.superadminOnly && !isSuperAdmin) return false;

  const dynamic = visibility[item.href];
  const hiddenFromStaff = dynamic
    ? dynamic.hiddenFromStaff
    : Boolean(item.restrictedFrom?.includes("staff"));
  // The 'admin' toggle covers both admin and superadmin — there's no
  // separate per-role split for that tier, only staff vs. everyone else.
  const hiddenFromAdminTier = dynamic ? dynamic.hiddenFromAdmin : false;

  if (role === "staff" && hiddenFromStaff) return false;
  if (role && role !== "staff" && hiddenFromAdminTier) return false;
  return true;
}

/** Same groups, filtered for what this role should actually see. A legacy
 * account with `role: null` sees everything, matching how the app behaved
 * before roles existed. `visibility` comes from usePageVisibility() — pass
 * `{}` (or omit) while it's still loading so items fall back to their static
 * `restrictedFrom` default instead of flashing visible. */
export function visibleNavGroups(
  role: UserRole | null,
  isSuperAdmin: boolean,
  isDeveloper: boolean = false,
  visibility: PageVisibilityMap = {}
): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        isVisible(item, role, isSuperAdmin, isDeveloper, visibility)
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function titleForPath(pathname: string) {
  const match = navItems.find((item) => isActive(pathname, item.href));
  return match?.label ?? "Template";
}
