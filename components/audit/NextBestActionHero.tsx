"use client";

import * as React from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/audit/types";

type PriorityTag = "URGENT" | "HIGH_ROI" | "QUICK_WIN" | "NORMAL";

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(dollars);
  } catch {
    return `${Math.round(dollars)} $`;
  }
}

function getPriority(opp: Opportunity): PriorityTag {
  const o: any = opp as any;
  const p =
    o.priority ??
    o.priorityTag ??
    o.urgency ??
    (typeof o.score === "number" ? o.score : undefined);

  if (typeof p === "string") {
    const up = p.toUpperCase();
    if (up.includes("URG")) return "URGENT";
    if (up.includes("ROI")) return "HIGH_ROI";
    if (up.includes("QUICK")) return "QUICK_WIN";
  }

  if (typeof p === "number") {
    if (p >= 90) return "URGENT";
    if (p >= 70) return "HIGH_ROI";
    if (p >= 50) return "QUICK_WIN";
  }

  const valueCents = (o.valueCents ?? 0) as number;
  if (valueCents >= 250000) return "HIGH_ROI";
  if (valueCents >= 100000) return "QUICK_WIN";

  return "NORMAL";
}

function PriorityBadge({ tag }: { tag: PriorityTag }) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border";
  switch (tag) {
    case "URGENT":
      return (
        <span className={`${base} border-[#c33541]/50 bg-[#c33541]/10 text-[#ffb3bb]`}>
          🔥 URGENT
        </span>
      );
    case "HIGH_ROI":
      return (
        <span className={`${base} border-amber-400/40 bg-amber-400/10 text-amber-200`}>
          💰 HIGH ROI
        </span>
      );
    case "QUICK_WIN":
      return (
        <span className={`${base} border-emerald-400/40 bg-emerald-400/10 text-emerald-200`}>
          ⚡ QUICK WIN
        </span>
      );
    default:
      return (
        <span className={`${base} border-white/10 bg-white/5 text-white/70`}>
          ✅ NEXT ACTION
        </span>
      );
  }
}

export default function NextBestActionHero({
  opportunity,
  onCopy,
  onMarkTreated,
  onRunAudit,
  onViewHistory,
  isBusy,
  lastActionSummary,
}: {
  opportunity: Opportunity | null;
  onCopy: (opp: Opportunity) => Promise<void>;
  onMarkTreated: (opp: Opportunity) => Promise<void>;
  onRunAudit: () => void | Promise<void>;
  onViewHistory: () => void;
  isBusy: boolean;
  lastActionSummary?: string | null;
}) {
  const shell =
    "relative overflow-hidden rounded-2xl sm:rounded-3xl " +
    "bg-slate-950 text-white " +
    "border-[4px] sm:border-[5px] border-[#c33541] ring-1 ring-[#c33541]/40 " +
    "shadow-[0_0_32px_rgba(195,53,65,0.16)]";

  // ✅ Empty state (mobile compact)
  if (!opportunity) {
    return (
      <section id="nba-card" className={`${shell} p-4 sm:p-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
            ✅ Tu es à jour
          </span>
        </div>

        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
          Rien d’urgent pour l’instant.
        </h2>

        <p className="mt-2 text-sm text-white/70">
          {lastActionSummary ? lastActionSummary : "Dernière action : mise à jour effectuée."}
        </p>

        {/* ✅ Boutons : moins de hauteur en mobile, wrap clean */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onRunAudit}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🔁 Relancer l’audit
          </button>

          <button
            onClick={onViewHistory}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            📊 Voir l’historique
          </button>

          <Link
            href="/autopilot"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            title="Ouvrir Auto-Pilot"
          >
            ⚡ Auto-Pilot
          </Link>
        </div>
      </section>
    );
  }

  // ✅ Normal state
  const o: any = opportunity as any;
  const title = o.title || o.name || "Prochaine action";
  const valueCents = (o.valueCents ?? 0) as number;
  const priority = getPriority(opportunity);

  const opportunityId = o.id ?? o.opportunityId ?? o.recoveryId ?? "";
  const autopilotHref = `/autopilot?opportunityId=${encodeURIComponent(opportunityId)}`;

  return (
    <section id="nba-card" className={`${shell} p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge tag={priority} />
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Audit
        </span>
      </div>

      <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
        À faire maintenant
      </h2>

      <p className="mt-2 text-sm sm:text-base text-white/70">{title}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold">
          💰 Impact : {formatCADCompact(valueCents)}
        </span>
      </div>

      {/* ✅ Actions compact mobile: wrap, pas de gros boutons full width */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onMarkTreated(opportunity)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-xl bg-[#c33541] px-4 py-2 text-sm font-bold hover:brightness-110"
        >
          ✅ Traité
        </button>

        <button
          onClick={() => onCopy(opportunity)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          📋 Copier
        </button>

        <Link
          href={autopilotHref}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          title="Ouvrir Auto-Pilot avec ce contexte"
        >
          ⚡ Auto-Pilot
        </Link>

        <button
          onClick={onViewHistory}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          📊 Historique
        </button>
      </div>
    </section>
  );
}
