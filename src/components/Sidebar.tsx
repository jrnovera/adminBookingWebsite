"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { isActive, visibleNavGroups } from "./navConfig";
import { IconLogout, IconSidebarCollapse } from "./Icons";
import SignOutConfirmDialog from "./SignOutConfirmDialog";

const COLLAPSE_KEY = "artisan.sidebar.collapsed";

export { navItems } from "./navConfig";

export default function Sidebar() {
  const pathname = usePathname();
  const { session, signOut, role, isSuperAdmin } = useAuth();
  const groups = visibleNavGroups(role, isSuperAdmin);
  const { settings } = useShop();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Restore the rail width the admin last chose, after mount so SSR markup
  // and the first client render agree.
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleSignOut() {
    setShowSignOutConfirm(false);
    await signOut();
  }

  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <aside
      data-collapsed={collapsed}
      className={`hidden h-full shrink-0 flex-col overflow-hidden bg-rail lg:flex ${
        ready ? "transition-[width] duration-300 ease-[var(--ease-out-quart)]" : ""
      } ${collapsed ? "w-[72px]" : "w-64"}`}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-3 px-4 py-5 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {settings?.logo_url ? (
          <Image
            src={settings.logo_url}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
            unoptimized
          />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-base font-semibold text-white shadow-lg shadow-black/30">
            {(settings?.shop_name ?? "Template").slice(0, 1).toUpperCase()}
          </span>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {settings?.shop_name ?? "Template"}
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-rail-text">
              Salon &amp; Spa
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="rail-scroll flex-1 overflow-y-auto px-3 pb-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {collapsed ? (
              <div className="mx-2 mb-2 h-px bg-rail-line" />
            ) : (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-rail-text/60">
                {group.label}
              </p>
            )}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                        collapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-gradient-to-r from-white/[0.14] to-white/[0.06] font-medium text-white shadow-sm shadow-black/20"
                          : "text-rail-text hover:bg-rail-hover hover:text-white"
                      }`}
                    >
                      {/* Active accent bar */}
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-light transition-opacity duration-200 ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <Icon
                        size={19}
                        className={`shrink-0 transition-transform duration-200 ${
                          active
                            ? "text-white"
                            : "text-rail-text group-hover:scale-105 group-hover:text-white"
                        }`}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="border-t border-rail-line p-3">
        <div
          className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span
            title={collapsed ? email : undefined}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-[11px] font-semibold text-white ring-1 ring-white/10"
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-medium text-white">{email}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-rail-text">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Signed in
              </p>
            </div>
          )}
        </div>

        <div className={`mt-2 flex gap-2 ${collapsed ? "flex-col" : ""}`}>
          <button
            onClick={() => setShowSignOutConfirm(true)}
            title="Sign out"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rail-line py-2 text-xs text-rail-text transition hover:bg-rail-hover hover:text-white"
          >
            <IconLogout size={15} />
            {!collapsed && "Sign out"}
          </button>
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid shrink-0 place-items-center rounded-xl border border-rail-line px-2.5 py-2 text-rail-text transition hover:bg-rail-hover hover:text-white"
          >
            <IconSidebarCollapse size={15} />
          </button>
        </div>
      </div>

      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </aside>
  );
}
