"use client";

import * as React from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/audit/types";

type PriorityTag = "URGENT" | "HIGH_ROI" | "QUICK_WIN" | "NORMAL";

type LastActionMeta = {
  summary: string;
  nextLabel?: string;
  nextHref?: string;
  nextHint?: string;
};

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

function buildGuidanceV2(tag: PriorityTag, valueCents: number) {
  const impact = valueCents > 0 ? `≈ ${formatCADCompact(valueCents)}` : "impact détecté";

  if (tag === "URGENT") {
    return {
      nowTitle: "Maintenant",
      nowText: "Traite cette opportunité pour éviter la perte immédiate.",
      thenTitle: "Ensuite",
      thenText: "Ça débloque les suivis et évite que le lead refroidisse.",
      afterTitle: "Après",
      afterText: "Passe en Auto-Pilot pour enchaîner les actions sans perdre le fil.",
      nextLabel: "⚡ Ouvrir Auto-Pilot",
      nextHint: `Objectif : enchaîner la suite (impact ${impact}).`,
    };
  }

  if (tag === "HIGH_ROI") {
    return {
      nowTitle: "Maintenant",
      nowText: "Action à fort ROI : traite-la pendant qu’elle est chaude.",
      thenTitle: "Ensuite",
      thenText: "Le pipeline devient prêt à automatiser (relances + conversions).",
      afterTitle: "Après",
      afterText: "Active Auto-Pilot pour exécuter la séquence recommandée.",
      nextLabel: "⚡ Continuer dans Auto-Pilot",
      nextHint: `Objectif : capturer le ROI (≈ ${impact}).`,
    };
  }

  if (tag === "QUICK_WIN") {
    return {
      nowTitle: "Maintenant",
      nowText: "Quick win : petite action, résultat immédiat.",
      thenTitle: "Ensuite",
      thenText: "Ça nettoie le recovery et ouvre la prochaine opportunité.",
      afterTitle: "Après",
      afterText: "Enchaîne dans Auto-Pilot si tu veux garder le momentum.",
      nextLabel: "⚡ Enchaîner (Auto-Pilot)",
      nextHint: `Objectif : garder le momentum (≈ ${impact}).`,
    };
  }

  return {
    nowTitle: "Maintenant",
    nowText: "Action recommandée pour garder le système net.",
    thenTitle: "Ensuite",
    thenText: "Ça évite l’accumulation et clarifie la prochaine priorité.",
    afterTitle: "Après",
    afterText: "Auto-Pilot est recommandé si tu veux enchaîner les actions sans réfléchir.",
    nextLabel: "⚡ Auto-Pilot",
    nextHint: "Objectif : exécution guidée, sans friction.",
  };
}

function V2Timeline({
  tag,
  valueCents,
  autopilotHref,
}: {
  tag: PriorityTag;
  valueCents: number;
  autopilotHref: string;
}) {
  const g = buildGuidanceV2(tag, valueCents);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-semibold text-white/70">Guidance</div>

      <div className="mt-3 grid gap-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
          <div className="text-xs font-semibold text-white">{g.nowTitle}</div>
          <div className="mt-1 text-sm text-white/70">{g.nowText}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
          <div className="text-xs font-semibold text-white">{g.thenTitle}</div>
          <div className="mt-1 text-sm text-white/70">{g.thenText}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
          <div className="text-xs font-semibold text-white">{g.afterTitle}</div>
          <div className="mt-1 text-sm text-white/70">{g.afterText}</div>
        </div>

        {/* ✅ CTA UNIQUE Auto-Pilot (plus de doublon) */}
        <div className="flex flex-col gap-1 pt-1">
  <Link
    href={autopilotHref}
    className="inline-flex w-fit items-center justify-center rounded-xl bg-[#c33541] px-4 py-2 text-sm font-bold hover:brightness-110"
    title={g.nextHint}
  >
    {g.nextLabel}
  </Link>

  <span className="text-xs text-white/60">
    Recommandé pour exécution guidée, sans friction.
  </span>
</div>

      </div>
    </div>
  );
}

function PostActionCard({
  meta,
  onRunAudit,
  onViewHistory,
}: {
  meta: LastActionMeta;
  onRunAudit: () => void | Promise<void>;
  onViewHistory: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="text-xs font-semibold text-emerald-200">✅ Action complétée</div>
      <div className="mt-1 text-sm text-white/80">{meta.summary}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {meta.nextHref ? (
          <Link
            href={meta.nextHref}
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            title={meta.nextHint || "Continuer"}
          >
            {meta.nextLabel ?? "Continuer"}
          </Link>
        ) : null}

        <button
          onClick={onRunAudit}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          🔁 Relancer l’audit
        </button>

        <button
          onClick={onViewHistory}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          📊 Historique
        </button>
      </div>
    </div>
  );
}

export default function NextBestActionHero({
  opportunity,
  onCopy,
  onMarkTreated,
  onRunAudit,
  onViewHistory,
  isBusy,
  lastActionSummary,
  lastActionMeta,
  showPostAction,
  canCopy,
}: {
  opportunity: Opportunity | null;
  onCopy: (opp: Opportunity) => Promise<void>;
  onMarkTreated: (opp: Opportunity) => Promise<void>;
  onRunAudit: () => void | Promise<void>;
  onViewHistory: () => void;
  isBusy: boolean;
  lastActionSummary?: string | null;
  lastActionMeta?: LastActionMeta | null;
  showPostAction?: boolean;
  canCopy?: boolean;
}) {
  const shell =
    "relative overflow-hidden rounded-2xl sm:rounded-3xl " +
    "bg-slate-950 text-white " +
    "border-[4px] sm:border-[5px] border-[#c33541] ring-1 ring-[#c33541]/40 " +
    "shadow-[0_0_32px_rgba(195,53,65,0.16)]";

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

        {showPostAction && lastActionMeta ? (
          <PostActionCard meta={lastActionMeta} onRunAudit={onRunAudit} onViewHistory={onViewHistory} />
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold text-white/70">Guidance</div>
            <div className="mt-2 text-sm text-white/70">
              Prochaine étape : relancer l’audit plus tard ou consulter l’historique pour confirmer les derniers changements.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </div>
        )}
      </section>
    );
  }

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

      <V2Timeline tag={priority} valueCents={valueCents} autopilotHref={autopilotHref} />

      {/* ✅ Boutons bas : plus de doublon Auto-Pilot */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onMarkTreated(opportunity)}
          disabled={isBusy}
          className="inline-flex items-center justify-center rounded-xl bg-[#c33541] px-4 py-2 text-sm font-bold hover:brightness-110"
        >
          ✅ Traité
        </button>

        {canCopy ? (
          <button
            onClick={() => onCopy(opportunity)}
            disabled={isBusy}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            title="Copier le message suggéré"
          >
            📋 Copier le message
          </button>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/45">
            📋 Copier (bientôt)
          </span>
        )}

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
