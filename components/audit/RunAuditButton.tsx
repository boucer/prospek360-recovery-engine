"use client";

import { useState } from "react";

export default function RunAuditButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunAudit() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? "Impossible de lancer l’audit.");
      }

      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleRunAudit}
        disabled={loading}
        type="button"
        className="
          inline-flex items-center justify-center
          rounded-lg px-5 py-2.5
          bg-black text-white font-semibold
          hover:bg-slate-800
          disabled:opacity-50
        "
      >
        {loading ? "Audit en cours…" : "Lancer l’audit"}
      </button>

      <span className="text-xs text-slate-400">
        Scan rapide • 30–60 secondes
      </span>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
