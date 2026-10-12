"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Permission, PermissionGroup, Role } from "@/lib/types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
} from "@/components/ui";

export default function AccessPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup[] | Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleList, permList] = await Promise.all([
        api.rbac.roles(),
        api.rbac.permissions(true),
      ]);
      setRoles(roleList);
      setPermissions(permList as PermissionGroup[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data akses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectRole(role: Role) {
    setSelectedRole(role);
    try {
      const detail = await api.rbac.role(role.id);
      setSelectedRole(detail);
    } catch {
      // fall back to the summary role already set
    }
  }

  const groupedPermissions = Array.isArray(permissions)
    ? (permissions as PermissionGroup[])
    : [];

  const actionTone = (
    action: string,
  ): "success" | "info" | "danger" | "neutral" => {
    switch (action) {
      case "create":
        return "success";
      case "update":
        return "info";
      case "delete":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Roles & Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Lihat peran sistem dan hak akses yang tersedia.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <LoadingBlock label="Memuat data akses…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Roles */}
          <Card>
            <CardHeader
              title="Roles"
              subtitle="Peran yang terdaftar di sistem"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <div className="mt-4 space-y-2">
              {roles.length === 0 ? (
                <EmptyState title="Belum ada role" />
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => void selectRole(role)}
                    className={
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors " +
                      (selectedRole?.id === role.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:bg-muted/50")
                    }
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{role.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {role.code}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>

            {selectedRole && selectedRole.permissions && selectedRole.permissions.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Permission untuk {selectedRole.name}
                </p>
                <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
                  {selectedRole.permissions.map((p) => (
                    <Badge key={p.id} tone="info">
                      {p.code}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          {/* Permissions grouped by resource */}
          <Card>
            <CardHeader
              title="Permissions"
              subtitle="Dikelompokkan berdasarkan resource"
              icon={<KeyRound className="h-4 w-4" />}
            />
            <div className="mt-4 space-y-4">
              {groupedPermissions.length === 0 ? (
                <EmptyState title="Belum ada permission" />
              ) : (
                groupedPermissions.map((group) => (
                  <div key={group.resource}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      {group.resource}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions.map((p) => (
                        <Badge key={p.id} tone={actionTone(p.action)}>
                          {p.action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
