"use client";

import * as React from "react";
import type { Opportunity } from "@/lib/audit/types";

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

type PriorityTag = "URGENT" | "HIGH_ROI" | "QUICK_WIN" | "NORMAL";

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
        <span
          className={`${base} border-[#c33541]/50 bg-[#c33541]/10 text-[#ffb3bb]`}
        >
          🔥 URGENT
        </span>
      );
    case "HIGH_ROI":
      return (
        <span
          className={`${base} border-amber-400/40 bg-amber-400/10 text-amber-200`}
        >
          💰 HIGH ROI
        </span>
      );
    case "QUICK_WIN":
      return (
        <span
          className={`${base} border-emerald-400/40 bg-emerald-400/10 text-emerald-200`}
        >
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

function buildReasons(opp: Opportunity): string[] {
  const o: any = opp as any;
  const reasons: string[] = [];

  const lastContactDays =
    typeof o.lastContactDays === "number" ? o.lastContactDays : undefined;
  const hasSequence =
    typeof o.hasSequence === "boolean" ? o.hasSequence : undefined;
  const engagement =
    typeof o.engagement === "string" ? o.engagement : undefined;

  if (typeof lastContactDays === "number") {
    reasons.push(
      `Dernier contact : ${lastContactDays} jours (à relancer maintenant)`
    );
  } else {
    reasons.push("Dernier contact ancien → probabilité de récupération élevée");
  }

  if (typeof hasSequence === "boolean") {
    reasons.push(
      hasSequence
        ? "Séquence déjà en place → optimiser le message"
        : "Aucun suivi automatisé actif → quick win"
    );
  } else {
    reasons.push("Aucun suivi automatisé actif → quick win");
  }

  if (engagement) {
    reasons.push(`Signal d’engagement : ${engagement}`);
  } else {
    reasons.push("Action simple et mesurable → momentum immédiat");
  }

  return reasons.slice(0, 3);
}

function MiniPulse() {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
    </span>
  );
}

// ✅ NEW: afficher “Dernière action traitée…”
function formatTimeAgo(ts: number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 20) return "à l’instant";
  if (diffSec < 60) return `il y a ${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h} h`;
}

export default function NextBestActionHero({
  opportunity,
  onCopy,
  onMarkTreated,
  onRunAudit,
  onViewHistory,
  isBusy,
  lastActionAt, // ✅ NEW
}: {
  opportunity: Opportunity | null;
  onCopy: (opp: Opportunity) => Promise<void>;
  onMarkTreated: (opp: Opportunity) => Promise<void>;
  onRunAudit: () => void | Promise<void>;
  onViewHistory: () => void;
  isBusy: boolean;
  lastActionAt?: number | null;
}) {
  // ----------------------------
  // ÉTAT AUCUNE OPPORTUNITÉ (EMPTY STATE — PLUS ADDICTIF)
  // ----------------------------
  if (!opportunity) {
    return (
      <section
        id="nba-card"
        className="
          relative overflow-hidden rounded-3xl p-6
          bg-slate-950 text-white
          border-[5px] border-[#c33541]
          ring-1 ring-[#c33541]/40
          shadow-[0_0_40px_rgba(195,53,65,0.18)]
        "
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(195,53,65,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#c33541]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <MiniPulse />
              À jour • Rien d’urgent
            </span>
            <span className="text-xs text-white/40">Prospek 360 • Recovery</span>
          </div>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white">
            Rien à traiter pour l’instant 🎯
          </h2>

          <p className="mt-3 max-w-prose text-sm text-white/70">
            Tu as éliminé toutes les opportunités détectées lors du dernier audit.
            <br />
            <span className="text-white font-semibold">
              Les prochaines opportunités apparaissent dès qu’un prospect ouvre,
              clique ou cesse de répondre.
            </span>
          </p>

          {/* ✅ NEW: dernière action traitée */}
          {typeof lastActionAt === "number" && lastActionAt > 0 && (
            <div className="mt-3 text-xs text-white/50">
              Dernière action traitée {formatTimeAgo(lastActionAt)}.
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/90">
                ✅ Tu es en avance
              </div>
              <ul className="mt-2 space-y-2 text-sm text-white/70">
                <li>
                  • Ton pipeline est “propre” (aucune action prioritaire en
                  attente).
                </li>
                <li>• Tu réduis la perte de revenus par oubli / délais.</li>
                <li>• Le prochain gain vient souvent après une relance.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white/90">
                🎯 Rituel (30 secondes)
              </div>
              <ol className="mt-2 space-y-2 text-sm text-white/70">
                <li>1) Relance l’audit (scan rapide)</li>
                <li>2) Vérifie l’historique (Undo/confirmé)</li>
                <li>3) Reviens plus tard → effet cumulatif</li>
              </ol>
              <div className="mt-3 text-[11px] text-white/50">
                Astuce : fais 2–3 scans par jour → tu “attrapes” les opportunités
                au bon moment.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRunAudit}
              disabled={isBusy}
              className="
                inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold
                bg-[#c33541] text-white hover:brightness-110 disabled:opacity-60
              "
            >
              {isBusy ? "⏳ Audit en cours…" : "🔁 Relancer l’audit"}
            </button>

            <button
              type="button"
              onClick={onViewHistory}
              className="
                inline-flex items-center justify-center rounded-xl border border-white/10
                bg-white/5 px-4 py-2 text-sm font-semibold text-white/80
                hover:bg-white/10
              "
            >
              📊 Voir l’historique
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ----------------------------
  // ÉTAT NORMAL (opportunité)
  // ----------------------------
  const o: any = opportunity as any;
  const title = (o.title as string) || (o.name as string) || "Prochaine action";
  const valueCents = (o.valueCents ?? 0) as number;
  const typeLabel = (o.typeLabel ?? o.type ?? "Opportunity") as string;

  const detail = (o.recommendedMessage ?? o.detail ?? o.action ?? "") as string;
  const hasCopy = Boolean(detail && String(detail).trim().length > 0);

  const priority = getPriority(opportunity);
  const reasons = buildReasons(opportunity);
  const etaMin = typeof o.etaMinutes === "number" ? o.etaMinutes : 2;

  return (
    <section
      id="nba-card"
      className="
        relative overflow-hidden rounded-3xl p-6
        bg-slate-950 text-white
        border-[5px] border-[#c33541]
        ring-1 ring-[#c33541]/40
        shadow-[0_0_40px_rgba(195,53,65,0.18)]
      "
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(195,53,65,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#c33541]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <PriorityBadge tag={priority} />
            <div className="mt-1 text-xs text-white/40">
              Décision prioritaire calculée automatiquement
            </div>
          </div>
          <span className="text-xs text-white/40">Prospek 360 • Recovery</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              À faire maintenant
            </h2>

            <div className="mt-2 text-sm text-white/70">{title}</div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white/90">
                💰 Impact estimé :{" "}
                <span className="text-white">{formatCADCompact(valueCents)}</span>
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white/70">
                🧩 Type : <span className="text-white/90">{typeLabel}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={onRunAudit}
              disabled={isBusy}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
              title="Relancer un audit"
            >
              🔁 Relancer audit
            </button>

            <button
              type="button"
              onClick={() => onMarkTreated(opportunity)}
              disabled={isBusy}
              className="
                inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-extrabold
                bg-[#c33541] text-white
                shadow-[0_10px_30px_rgba(195,53,65,0.25)]
                hover:brightness-110 active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed
              "
              title="Marquer comme traité"
            >
              {isBusy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Traitement…
                </span>
              ) : (
                <>✅ Marquer traité</>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white/90">
            Pourquoi cette action ?
          </div>

          <ul className="mt-2 space-y-1 text-sm text-white/70">
            {reasons.map((r, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 text-[11px] text-white/50">
            ⏱️ {etaMin} minute{etaMin > 1 ? "s" : ""} • Annuler via “En attente (Undo)” (5 min)
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-white/55">
            Astuce : copie le message → envoie → marque traité. (flow ultra rapide)
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              title="Aller à l'historique"
            >
              📊 Historique
            </button>

            <button
              type="button"
              onClick={() => onCopy(opportunity)}
              disabled={isBusy || !hasCopy}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
              title={hasCopy ? "Copier le message" : "Aucun message à copier"}
            >
              📋 Copier le message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
