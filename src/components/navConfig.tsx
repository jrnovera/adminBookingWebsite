import {
  IconBox,
  IconCalendar,
  IconChart,
  IconClipboardCheck,
  IconClock,
  IconDashboard,
  IconPieChart,
  IconRegister,
  IconScissors,
  IconSettings,
  IconTag,
  IconUsers,
  IconWallet,
} from "./Icons";
import type { UserRole } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
  /** Hidden from these roles — currently only 'staff' is ever restricted;
   * admin and superadmin see everything. Undefined = visible to all. */
  restrictedFrom?: UserRole[];
  /** Visible only to the superadmin — separate from restrictedFrom because
   * this hides from admin too, not just staff. */
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

function isVisible(
  item: NavItem,
  role: UserRole | null,
  isSuperAdmin: boolean
): boolean {
  if (item.superadminOnly && !isSuperAdmin) return false;
  if (role && item.restrictedFrom?.includes(role)) return false;
  return true;
}

/** Same groups, filtered for what this role should actually see. A legacy
 * account with `role: null` sees everything, matching how the app behaved
 * before roles existed. */
export function visibleNavGroups(
  role: UserRole | null,
  isSuperAdmin: boolean
): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isVisible(item, role, isSuperAdmin)),
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
