import {
  IconActivity,
  IconBox,
  IconCalendar,
  IconChart,
  IconClock,
  IconDashboard,
  IconRegister,
  IconScissors,
  IconSettings,
  IconTag,
  IconUsers,
} from "./Icons";

export type NavItem = {
  href: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
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
      { href: "/activity", label: "Activity", icon: IconActivity },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/clients", label: "Clients", icon: IconUsers },
      { href: "/pos", label: "Point of Sale", icon: IconRegister },
      { href: "/reports", label: "Reports", icon: IconChart },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/staff", label: "Team", icon: IconScissors },
      { href: "/inventory", label: "Inventory", icon: IconBox },
      { href: "/promos", label: "Promos", icon: IconTag },
      { href: "/settings", label: "Settings", icon: IconSettings },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function titleForPath(pathname: string) {
  const match = navItems.find((item) => isActive(pathname, item.href));
  return match?.label ?? "Artisan";
}
