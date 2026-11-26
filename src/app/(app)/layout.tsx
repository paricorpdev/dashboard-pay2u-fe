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

  const blocked = loading || !user || !canAccessRoute(pathname);
  const loadingLabel = loading
    ? "Memverifikasi sesi…"
    : !user
      ? "Mengarahkan ke login…"
      : "Mengarahkan ke halaman yang sesuai…";

  // Keep the route segment in the render tree so Next.js can validate and
  // pre-render it for instant navigation. The full-screen cover prevents the
  // protected UI from being visible until the session and route permission are
  // verified.
  return (
    <>
      <div
        aria-hidden={blocked}
        className={blocked ? "invisible pointer-events-none" : undefined}
      >
        <AppShell>{children}</AppShell>
      </div>
      {blocked ? (
        <div className="fixed inset-0 z-[100] grid min-h-screen place-items-center bg-background">
          <LoadingBlock label={loadingLabel} />
        </div>
      ) : null}
    </>
  );
}
