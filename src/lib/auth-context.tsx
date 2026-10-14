"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ApiError, tokenStore } from "./api";
import type { User } from "./types";

export const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  "/dashboard": "analytics.read",
  "/analytics": "analytics.read",
  "/transactions": "transactions.read",
  "/merchants": "merchants.read",
  "/access": ["roles.read", "permissions.read"],
};

export function userHasPermission(
  user: User | null,
  permissionCode: string,
): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some((role) => {
    if (role.code === "ROLE_SUPER_ADMIN") return true;
    if (!role.permissions) return false;
    return role.permissions.some((p: unknown) => {
      if (typeof p === "string") return p === permissionCode;
      if (typeof p === "object" && p !== null && "code" in p) {
        return (p as { code: string }).code === permissionCode;
      }
      return false;
    });
  });
}

export function userHasAnyPermission(
  user: User | null,
  permissionCodes: string[],
): boolean {
  if (!user || !user.roles) return false;
  return permissionCodes.some((code) => userHasPermission(user, code));
}

export function userCanAccessRoute(
  user: User | null,
  pathname: string,
): boolean {
  if (!user) return false;
  if (user.roles?.some((r) => r.code === "ROLE_SUPER_ADMIN")) return true;

  const baseRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!baseRoute) return true;

  const required = ROUTE_PERMISSIONS[baseRoute];
  if (Array.isArray(required)) {
    return userHasAnyPermission(user, required);
  }
  return userHasPermission(user, required);
}

export function getDefaultRouteForUser(user: User | null): string {
  if (!user) return "/login";
  if (userCanAccessRoute(user, "/dashboard")) return "/dashboard";
  if (userCanAccessRoute(user, "/transactions")) return "/transactions";
  if (userCanAccessRoute(user, "/merchants")) return "/merchants";
  if (userCanAccessRoute(user, "/analytics")) return "/analytics";
  if (userCanAccessRoute(user, "/access")) return "/access";
  return "/dashboard";
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  getDefaultRoute: () => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.auth.current();
      setUser(me);
    } catch (err) {
      // Clear session if token is invalid or explicitly rejected (401/403)
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        tokenStore.clear();
        setUser(null);
      } else if (!tokenStore.access) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // When the API layer signals an unrecoverable 401, drop the session.
  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear();
      setUser(null);
    };
    window.addEventListener("pay2u:unauthorized", onUnauthorized);
    return () => window.removeEventListener("pay2u:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    tokenStore.set(res.access_token, res.refresh_token);
    const me = res.user ?? (await api.auth.current());
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore network errors on logout — still clear local session
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (code: string) => userHasPermission(user, code),
    [user],
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => userHasAnyPermission(user, codes),
    [user],
  );

  const canAccessRoute = useCallback(
    (pathname: string) => userCanAccessRoute(user, pathname),
    [user],
  );

  const getDefaultRoute = useCallback(
    () => getDefaultRouteForUser(user),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser: loadUser,
      hasPermission,
      hasAnyPermission,
      canAccessRoute,
      getDefaultRoute,
    }),
    [
      user,
      loading,
      login,
      logout,
      loadUser,
      hasPermission,
      hasAnyPermission,
      canAccessRoute,
      getDefaultRoute,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
