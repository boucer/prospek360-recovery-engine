"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = useMemo(() => {
    const n = searchParams.get("next") || "/admin/tenants";
    // safety: force admin-only path
    return n.startsWith("/admin") ? n : "/admin/tenants";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, next }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; next?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Connexion refusée.");
        setLoading(false);
        return;
      }

      router.replace(data.next || next);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[900px] items-center px-6 py-10">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="text-lg font-semibold">Admin — Prospek 360</div>
          <div className="mt-1 text-sm text-white/70">
            Connecte-toi pour gérer les tenants et le branding.
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-white/80">
                Mot de passe admin
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <div className="text-center text-xs text-white/40">
              Redirection après connexion :{" "}
              <span className="text-white/60">{next}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white grid place-items-center">
          <div className="text-sm text-white/60">Chargement…</div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
