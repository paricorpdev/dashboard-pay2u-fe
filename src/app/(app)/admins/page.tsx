"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PagedResponse, User } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Label,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

const emptyForm = { username: "", fullName: "", email: "", password: "" };

export default function AdminsPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [paging, setPaging] = useState({ page: 1, totalPage: 1, totalData: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PagedResponse<User> = await api.users.listAdmins({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setRows(result.data);
      setPaging({
        page: result.paging.page,
        totalPage: result.paging.total_page || 1,
        totalData: result.paging.total_data,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar admin.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function startEdit(admin: User) {
    setEditing(admin);
    setForm({
      username: admin.username,
      fullName: admin.full_name,
      email: admin.email ?? "",
      password: "",
    });
    setFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (editing) {
        await api.users.updateAdmin(editing.id, {
          username: form.username.trim(),
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
        });
        setSuccess(`Data admin ${form.username.trim()} berhasil diperbarui.`);
        closeForm();
        await load();
      } else {
        const created = await api.users.createAdmin({
          username: form.username.trim(),
          full_name: form.fullName.trim(),
          email: form.email.trim() || null,
          password: form.password,
        });
        setSuccess(`Akun admin ${created.username} berhasil dibuat.`);
        closeForm();
        if (page === 1) await load();
        else setPage(1);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan akun admin.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(admin: User) {
    setError(null);
    setSuccess(null);
    try {
      if (admin.status === "ACTIVE") {
        if (!window.confirm(`Nonaktifkan admin ${admin.username}?`)) return;
        await api.users.deactivateAdmin(admin.id);
        setSuccess(`Admin ${admin.username} dinonaktifkan.`);
      } else {
        await api.users.updateAdmin(admin.id, { status: "ACTIVE" });
        setSuccess(`Admin ${admin.username} diaktifkan kembali.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status admin.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Manajemen Admin</h2>
          <p className="text-sm text-muted-foreground">
            Kelola akun Admin dan status aksesnya. Admin nonaktif tetap tercatat sebagai pemilik merchant lama.
          </p>
        </div>
        {!formOpen ? (
          <Button onClick={startCreate}>
            <UserPlus className="h-4 w-4" /> Tambah Admin
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      ) : null}

      {formOpen ? (
        <Card>
          <CardHeader
            title={editing ? "Edit Admin" : "Tambah Admin"}
            subtitle={editing ? "Kosongkan password jika tidak ingin menggantinya." : "Akun baru otomatis mendapat role Admin."}
            icon={editing ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            action={
              <Button type="button" variant="ghost" onClick={closeForm} title="Tutup form">
                <X className="h-4 w-4" />
              </Button>
            }
          />
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="admin-full-name">Nama lengkap</Label>
              <Input
                id="admin-full-name"
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
                maxLength={150}
              />
            </div>
            <div>
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
                minLength={3}
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="admin-email">Email (opsional)</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                maxLength={150}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">{editing ? "Password baru (opsional)" : "Password awal"}</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required={!editing}
                minLength={8}
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 md:col-span-2">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Simpan Perubahan" : "Buat Admin"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="admin-search">Pencarian</Label>
            <Input
              id="admin-search"
              placeholder="Cari nama, username, atau email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Label htmlFor="admin-status">Status</Label>
            <Select id="admin-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Semua status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <LoadingBlock label="Memuat daftar admin..." />
        ) : rows.length === 0 ? (
          <EmptyState title="Admin belum ada" description="Buat akun Admin untuk mulai mendaftarkan merchant." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Nama</th>
                    <th className="pb-3 pr-4 font-medium">Username</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Dibuat</th>
                    <th className="pb-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((admin) => (
                    <tr key={admin.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{admin.full_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{admin.username}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{admin.email || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={admin.status === "ACTIVE" ? "success" : "danger"}>
                          {admin.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDate(admin.created_at)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" title="Edit admin" onClick={() => startEdit(admin)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            title={admin.status === "ACTIVE" ? "Nonaktifkan admin" : "Aktifkan admin"}
                            onClick={() => void toggleStatus(admin)}
                          >
                            {admin.status === "ACTIVE" ? <UserX className="h-4 w-4 text-danger" /> : <UserCheck className="h-4 w-4 text-success" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Total {paging.totalData} admin · Halaman {paging.page} dari {paging.totalPage}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" disabled={page >= paging.totalPage || loading} onClick={() => setPage((value) => value + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
