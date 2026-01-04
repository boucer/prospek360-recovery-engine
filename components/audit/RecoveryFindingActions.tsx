"use client";

import { useState } from "react";

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export default function RecoveryFindingActions({
  action,
  handled,
  valueCents,
  onMarkHandled,
}: {
  action: string;
  handled: boolean;
  valueCents: number;
  onMarkHandled?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(action ?? "");
      setCopied(true);

      window.dispatchEvent(
        new CustomEvent("recovery:copied", {
          detail: { message: "📋 Message copié ✅" },
        })
      );

      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={copy}
        type="button"
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
          copied
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-slate-950/40 text-slate-100 hover:bg-white/10",
        ].join(" ")}
      >
        {copied ? "✅ Message copié" : "📋 Copier le message"}
      </button>

      {!handled ? (
        <button
          onClick={onMarkHandled}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/12 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-red-500/18 transition"
        >
          🔥 Marquer comme traité
        </button>
      ) : (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
              ✅ Traité
            </span>
            <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
              {formatCADCompact(valueCents)} récupéré
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
