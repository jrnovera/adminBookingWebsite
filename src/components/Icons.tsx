/**
 * Stroke icon set, 24×24 on a 1.6 stroke. Inherits `currentColor` and sizes
 * from the `size` prop so icons match whatever text they sit beside.
 */

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="8.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.8" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20.2a6.4 6.4 0 0 1 12.4 0" />
      <path d="M16.5 4.8a3.6 3.6 0 0 1 0 6.9M18 14.6a6.4 6.4 0 0 1 3.2 5.6" />
    </Svg>
  );
}

export function IconRegister(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="8.5" width="18" height="12.5" rx="2.2" />
      <path d="M7 8.5V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2.5" />
      <path d="M8.5 13.5h7M8.5 17h4" />
    </Svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 7.8v8.4a1.8 1.8 0 0 1-.95 1.6l-6.7 3.6a1.8 1.8 0 0 1-1.7 0l-6.7-3.6a1.8 1.8 0 0 1-.95-1.6V7.8" />
      <path d="M3.9 7.1 11.15 3.2a1.8 1.8 0 0 1 1.7 0L20.1 7.1a.8.8 0 0 1 0 1.4l-7.25 3.9a1.8 1.8 0 0 1-1.7 0L3.9 8.5a.8.8 0 0 1 0-1.4Z" />
      <path d="M12 12.6V21" />
    </Svg>
  );
}

export function IconScissors(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6.5" r="2.8" />
      <circle cx="6" cy="17.5" r="2.8" />
      <path d="M8.4 8.1 20 19M20 5 8.4 15.9" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20.5h17" />
      <path d="M7 20.5v-6.2M12 20.5V8.2M17 20.5v-9.4" />
    </Svg>
  );
}

export function IconPieChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12Z" />
      <path d="M15.8 3.9A8.5 8.5 0 0 1 20.1 8.2H12Z" />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11.6 3H20a1 1 0 0 1 1 1v8.4a1.6 1.6 0 0 1-.47 1.13l-7.2 7.2a1.6 1.6 0 0 1-2.26 0l-7.8-7.8a1.6 1.6 0 0 1 0-2.26l7.2-7.2A1.6 1.6 0 0 1 11.6 3Z" />
      <circle cx="16.4" cy="7.6" r="1.5" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.4a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06A1.8 1.8 0 1 1 4.25 16.4l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H3a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06A1.8 1.8 0 1 1 6.66 4.95l.06.06a1.5 1.5 0 0 0 1.65.3H8.5a1.5 1.5 0 0 0 .9-1.37V3a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.08a1.5 1.5 0 0 0 1.37.9H21a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5.2-2 6.8-2 6.8h16s-2-1.6-2-6.8Z" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" strokeWidth={2} />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.2" strokeWidth={2} />
      <circle cx="12" cy="16.4" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" strokeWidth={2} />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 9 12 15.5 18.5 9" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.2 16.2 21 21" />
    </Svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 21H6a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 6 3h3.5" />
      <path d="M16 16.5 20.5 12 16 7.5M20 12H9.5" />
    </Svg>
  );
}

export function IconSidebarCollapse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 5.5 8 12l6 6.5" />
      <path d="M18 5.5 12 12l6 6.5" />
    </Svg>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12.5h4l2.4-6 4 13 2.6-7h5" />
    </Svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l.9-4.2a1.6 1.6 0 0 1 .44-.8L16.2 4.14a1.8 1.8 0 0 1 2.55 0l1.11 1.1a1.8 1.8 0 0 1 0 2.56L9 18.66a1.6 1.6 0 0 1-.8.44L4 20Z" />
      <path d="M14.4 6l3.6 3.6" />
    </Svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
    </Svg>
  );
}

export function IconCollapse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9h5V4M15 4v5h5M20 15h-5v5M9 20v-5H4" />
    </Svg>
  );
}

export function IconBan(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6 18.4 18.4" />
    </Svg>
  );
}

export function IconClipboardCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12.5l2 2 4-4.5" />
    </Svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2.2" />
      <path d="M3 10h18" />
      <path d="M15.5 14.2h2.5" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3h6M4 6h16M8 9v10a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5V9M10 13v4M14 13v4" />
    </Svg>
  );
}
