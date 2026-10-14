"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  BarChart3,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/access", label: "Roles & Akses", icon: ShieldCheck },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAccessRoute } = useAuth();

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => canAccessRoute(item.href));
  }, [canAccessRoute]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/logo.png"
          alt="PayGate logo"
          width={44}
          height={44}
          className="h-11 w-11 rounded-xl shadow-lg shadow-primary/25 object-contain bg-white/60"
          priority
        />
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">PayGate</p>
          <p className="text-[11px] text-muted-foreground">Payment Monitoring</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleNavItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 p-3">
          <p className="text-xs font-semibold text-foreground">Pay2U Gateway</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Monitoring real-time pembayaran VA & QRIS.
          </p>
        </div>
      </div>
    </aside>
  );
}
