"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { tokenStore } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { LoadingBlock } from "@/components/ui";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && !tokenStore.access) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingBlock label="Memverifikasi sesi…" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
