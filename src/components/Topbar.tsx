"use client";

import { usePathname } from "next/navigation";
import Notifications from "./Notifications";
import { IconMenu } from "./Icons";
import { titleForPath } from "./navConfig";

export default function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenNav}
        aria-label="Open navigation menu"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-foreground transition hover:bg-background lg:hidden"
      >
        <IconMenu size={18} />
      </button>

      {/* On phones the rail is hidden, so the bar carries the page name. */}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">
        {titleForPath(pathname)}
      </p>
      <div className="hidden flex-1 lg:block" />

      <Notifications />
    </header>
  );
}
