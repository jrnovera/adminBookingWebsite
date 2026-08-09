"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";

export const navItems = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/calendar", label: "Calendar", icon: "▤" },
  { href: "/appointments", label: "Appointments", icon: "◷" },
  { href: "/clients", label: "Clients", icon: "◍" },
  { href: "/pos", label: "POS", icon: "◈" },
  { href: "/inventory", label: "Inventory", icon: "▣" },
  { href: "/staff", label: "Staff", icon: "◎" },
  { href: "/reports", label: "Reports", icon: "◔" },
  { href: "/promos", label: "Promos", icon: "◇" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { settings } = useShop();
  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-rail lg:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        {settings?.logo_url ? (
          <Image
            src={settings.logo_url}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-cover"
            unoptimized
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-lg text-white">
            ✦
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">
            {settings?.shop_name ?? "Artisan"}
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-rail-text">
            Salon &amp; Spa
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/[0.12] font-medium text-white"
                  : "text-rail-text hover:bg-rail-hover hover:text-white"
              }`}
            >
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-medium text-white">
            {initials}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium text-white">{email}</p>
            <p className="text-[11px] text-rail-text">Signed in</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-3 w-full rounded-xl border border-white/15 py-2 text-xs text-rail-text transition hover:bg-rail-hover hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
