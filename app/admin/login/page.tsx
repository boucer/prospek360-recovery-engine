// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, next }),
    });

    setLoading(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error || "Mot de passe invalide.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-semibold">Admin — Prospek 360</div>
        <div className="mt-1 text-sm text-white/70">
          Accès interne (cookie). Aucun compte requis.
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none"
            placeholder="Mot de passe admin"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div className="text-xs text-white/50">
            Astuce : définir <code>ADMIN_PASSWORD</code> dans .env
          </div>
        </form>
      </div>
    </div>
  );
}
