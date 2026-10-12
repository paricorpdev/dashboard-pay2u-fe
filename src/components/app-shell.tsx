"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/analytics": "Analytics & Grafik",
  "/transactions": "Daftar Transaksi",
  "/merchants": "Manajemen Merchant",
  "/access": "Roles & Permissions",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.keys(TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLES[match] : "PayGate";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on route change.
  useEffect(() => setMobileOpen(false), [pathname]);

  const initials = (user?.full_name ?? user?.username ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="aurora" />
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <div className="fixed inset-y-0 left-0">
            <Sidebar />
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 z-50 shadow-2xl">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/70 px-4 backdrop-blur-xl lg:px-8">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand logo — visible on mobile where the sidebar is hidden. */}
            <div className="flex items-center gap-2 lg:hidden">
              <Image
                src="/logo.png"
                alt="PayGate logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="text-sm font-semibold text-foreground">PayGate</span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-foreground">
                {titleFor(pathname)}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {user?.full_name ?? user?.username ?? "Pengguna"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {user?.roles?.[0]?.name ?? "—"}
                </p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-white">
                {initials}
              </div>
              <Button variant="ghost" onClick={() => void logout()} className="px-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </>
  );
}
