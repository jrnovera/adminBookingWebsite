"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Topbar from "./Topbar";
import { ToastProvider } from "./Toast";
import { useAuth } from "@/lib/auth";

const publicRoutes = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const isPublic = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [session, loading, isPublic, router]);

  if (loading) return <SplashMessage>Loading your workspace…</SplashMessage>;

  if (isPublic) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (!session) return <SplashMessage>Redirecting to sign in…</SplashMessage>;

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

        {/* This column owns the scrollbar — the rail and topbar stay put. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}

function SplashMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary-light to-primary text-lg font-semibold text-white shadow-lg">
          A
        </span>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}
