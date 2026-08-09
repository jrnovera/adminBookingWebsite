"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Notifications from "./Notifications";
import { useAuth } from "@/lib/auth";

const publicRoutes = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [session, loading, isPublic, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (isPublic) return <>{children}</>;

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <div className="flex justify-end border-b border-line bg-white px-6 py-2">
          <Notifications />
        </div>
        {children}
      </div>
    </div>
  );
}
