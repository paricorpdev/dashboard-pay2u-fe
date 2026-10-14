"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { tokenStore } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { LoadingBlock } from "@/components/ui";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, canAccessRoute, getDefaultRoute } = useAuth();

  useEffect(() => {
    if (!loading && !user && !tokenStore.access) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user) {
      if (!canAccessRoute(pathname)) {
        router.replace(getDefaultRoute());
      }
    }
  }, [loading, user, pathname, canAccessRoute, getDefaultRoute, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingBlock label="Memverifikasi sesi…" />
      </div>
    );
  }

  // If user doesn't have permission for this route, show loading while redirecting
  if (!canAccessRoute(pathname)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingBlock label="Mengarahkan ke halaman yang sesuai…" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
