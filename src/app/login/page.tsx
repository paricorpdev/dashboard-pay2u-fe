"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Lock, LogIn, User } from "lucide-react";
import { useAuth, getDefaultRouteForUser } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, getDefaultRoute } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect once already authenticated.
  useEffect(() => {
    if (!loading && user) router.replace(getDefaultRoute());
  }, [loading, user, router, getDefaultRoute]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      router.replace(getDefaultRouteForUser(loggedInUser));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Terjadi kesalahan. Pastikan backend berjalan.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="aurora" />
      <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="PayGate logo"
            width={72}
            height={72}
            className="mb-4 rounded-2xl shadow-xl shadow-primary/30"
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Selamat Datang di PayGate
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk memantau pembayaran VA & QRIS Anda.
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass space-y-5 rounded-2xl p-6 shadow-2xl shadow-black/30">
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="admin"
                className="pl-9"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="px-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={submitting}>
            {!submitting ? <LogIn className="h-4 w-4" /> : null}
            Masuk
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pay2U Gateway · Dashboard pemantauan pembayaran
        </p>
        </div>
      </div>
    </>
  );
}
