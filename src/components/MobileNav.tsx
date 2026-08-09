"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line bg-white px-3 py-2 lg:hidden">
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
              active
                ? "bg-foreground text-white"
                : "text-foreground/70 hover:bg-background"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
