"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { usePageVisibility } from "@/lib/pageVisibility";
import { isActive, visibleNavGroups } from "./navConfig";
import { IconClose, IconLogout } from "./Icons";
import SignOutConfirmDialog from "./SignOutConfirmDialog";

/**
 * Full-height slide-over navigation for phones and tablets. Replaces the old
 * horizontal chip strip, which truncated most destinations off-screen.
 */
export default function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { session, signOut, role, isSuperAdmin, isDeveloper } = useAuth();
  const { visibility } = usePageVisibility();
  const groups = visibleNavGroups(role, isSuperAdmin, isDeveloper, visibility);
  const { settings } = useShop();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  async function handleSignOut() {
    setShowSignOutConfirm(false);
    await signOut();
  }

  // Close on route change so tapping a link doesn't leave the panel open.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape closes; body scroll locks while the panel covers the page.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        onClick={onClose}
        aria-label="Close menu"
        className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="animate-slide-in-left relative flex h-full w-[min(19rem,85vw)] flex-col bg-rail shadow-2xl"
      >
        <div className="flex items-center gap-3 px-4 py-4">
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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-light to-primary text-base font-semibold text-white">
              {(settings?.shop_name ?? "Template").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">
              {settings?.shop_name ?? "Template"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-rail-text">
              Salon &amp; Spa
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-rail-text transition hover:bg-rail-hover hover:text-white"
          >
            <IconClose size={18} />
          </button>
        </div>

        <nav className="rail-scroll flex-1 overflow-y-auto px-3 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-rail-text/60">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                          active
                            ? "bg-gradient-to-r from-white/[0.14] to-white/[0.06] font-medium text-white"
                            : "text-rail-text active:bg-rail-hover"
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-light ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <Icon size={19} className="shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-rail-line p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-[11px] font-semibold text-white ring-1 ring-white/10">
              {initials}
            </span>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-white">
              {email}
            </p>
          </div>
          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rail-line py-2.5 text-xs text-rail-text transition active:bg-rail-hover"
          >
            <IconLogout size={15} />
            Sign out
          </button>
        </div>
      </div>

      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
}
