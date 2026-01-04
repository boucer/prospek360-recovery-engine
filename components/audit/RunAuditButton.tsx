"use client";

import { useState } from "react";
import Link from "next/link";

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

      // Refresh simple (ton module est server-rendered + prisma)
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Row de boutons (top-left) */}
      <div className="flex gap-3">
        {/* Lancer l’audit (inchangé) */}
        <button
          onClick={handleRunAudit}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-black text-white hover:bg-slate-800 disabled:opacity-50"
          type="button"
        >
          {loading ? "Audit..." : "Lancer l’audit"}
        </button>

        
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
