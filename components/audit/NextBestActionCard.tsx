"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/audit/types";

function emitToast(message: string, ms = 2600) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("recovery:toast", { detail: { message, ms } }));
}

export default function NextBestActionCard({
  opportunity,
  onCopy,
  onMarkTreated,
  onRunAudit,
  onViewInList,
  isBusy,
  hideValue = false,

  // ✅ optionnels (compat si ton client les passe)
  prevHref,
  nextHref,
  urgentHref,
  noreplyHref,
  allHref,
}: {
  opportunity: Opportunity | null;

  onCopy?: (o: Opportunity) => void;

  // ⚠️ compat: on garde le nom,
  // UX = "mettre en file Auto-Pilot"
  onMarkTreated?: (o: Opportunity) => void;

  onRunAudit?: () => void;
  onViewInList?: () => void;

  isBusy?: boolean;
  hideValue?: boolean;

  prevHref?: string;
  nextHref?: string;
  urgentHref?: string;
  noreplyHref?: string;
  allHref?: string;
}) {
  const [justHandled, setJustHandled] = useState(false);

  // micro anim triggers (local)
  const [wow, setWow] = useState<"idle" | "fire">("idle");
  const [sparkSeed, setSparkSeed] = useState(0);

  useEffect(() => {
    // reset quand l’opportunité change
    setJustHandled(false);
    setWow("idle");
  }, [opportunity?.id]);

  const value = useMemo(() => {
    if (!opportunity) return 0;
    return Math.round(((opportunity as any).valueCents ?? 0) / 100);
  }, [opportunity]);

  if (!opportunity) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
        Aucune opportunité pour le moment.
      </div>
    );
  }

  const priorityLabel = (opportunity as any).priorityLabel ?? "—";
  const typeCode = (opportunity as any).typeCode ?? "—";
  const typeLabel = (opportunity as any).typeLabel ?? (opportunity as any).type ?? "Opportunité";
  const autopilotQueued = Boolean((opportunity as any)?.autopilotQueued);

  const detail =
    (opportunity as any).detail ??
    (opportunity as any).description ??
    "Détails indisponibles.";

  function fireWow() {
    setWow("fire");
    setSparkSeed((s) => s + 1);
    setTimeout(() => setWow("idle"), 520);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur ${
        wow === "fire" ? "animate-reward-pulse" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          ✅ NEXT ACTION
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3 text-xl font-semibold tracking-tight">{typeLabel}</h3>

      {/* Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
          Priorité : {priorityLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
          Type : {typeCode}
        </span>
        {autopilotQueued ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
            ⚡ En file Auto-Pilot
          </span>
        ) : null}
      </div>

      {/* Desc */}
      <p className="mt-4 text-sm leading-relaxed text-slate-100/90">{detail}</p>

      {/* Value */}
      {!hideValue ? (
        <div className="mt-4 inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          💰 Valeur : {value} $
        </div>
      ) : null}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        {/* ✅ CTA principal unique */}
        {onMarkTreated ? (
          <button
            type="button"
            onClick={() => {
              setJustHandled(true);
              onMarkTreated(opportunity);
              fireWow();
              emitToast("✅ Mis en file Auto-Pilot.", 2600);
            }}
            disabled={isBusy || autopilotQueued}
            className="rounded-2xl bg-[#c33541] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(195,53,65,0.25)] hover:bg-[#d43f4b] disabled:opacity-60"
          >
            {autopilotQueued ? "✅ Déjà en file Auto-Pilot" : "⚡ Mettre en file Auto-Pilot"}
          </button>
        ) : null}

        {onCopy ? (
          <button
            type="button"
            onClick={() => {
              onCopy(opportunity);
              fireWow();
              emitToast("📋 Message copié.", 2400);
            }}
            disabled={isBusy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            📋 Copier
          </button>
        ) : null}

        {onViewInList ? (
          <button
            type="button"
            onClick={() => onViewInList()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            📌 Voir dans l’historique
          </button>
        ) : null}

        {onRunAudit ? (
          <button
            type="button"
            onClick={() => onRunAudit()}
            className="ml-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ↻ Relancer audit
          </button>
        ) : null}
      </div>

      {/* ✅ micro next step */}
      <p className="mt-2 text-xs text-white/55">
        Prochaine étape : copie le message → exécute l’action → reviens pour enchaîner.
      </p>

      {/* Local confirm */}
      {justHandled ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          ✅ En file. Tu peux passer à la prochaine action.
        </div>
      ) : null}
    </div>
  );
}
