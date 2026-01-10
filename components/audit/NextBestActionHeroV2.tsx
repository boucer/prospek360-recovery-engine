"use client";

import * as React from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/audit/types";

export type LastActionMetaV2 = {
  summary: string;
  nextLabel?: string;
  nextHref?: string;
  nextHint?: string;
};

type Props = {
  opportunity?: Opportunity | null;
  lastActionMeta?: LastActionMetaV2 | null;

  // optionnels (selon ton parent)
  prevHref?: string;
  nextHref?: string;
  urgentHref?: string;
  noreplyHref?: string;
  allHref?: string;

  reportHref?: string;

  // certains parents peuvent passer ces flags
  isEmpty?: boolean;
  auditClean?: boolean;
  contextMissing?: boolean;
  contextMessage?: string;

  // accepte props extra sans casser
  [key: string]: any;
};

type Mode = "NO_CONTEXT" | "CLEAN" | "DETECTED" | "ACTION";

function scrollToOpportunities(highlightId?: string | null) {
  // 1) scroll vers la section
  const section =
    document.getElementById("opportunities") ||
    document.getElementById("opportunities-section");

  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // 2) puis focus précis (si disponible)
  if (highlightId) {
    setTimeout(() => {
      const el = document.getElementById(`finding-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-red-500/40");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-red-500/40");
        }, 1400);
      }
    }, 300);
  }
}

function severityToTag(sev: number) {
  if (sev >= 5) return "⚡ NEXT ACTION";
  if (sev >= 4) return "🔥 HIGH ROI";
  if (sev >= 3) return "✅ QUICK WIN";
  return "NEXT";
}

export default function NextBestActionHeroV2(props: Props) {
  const opportunity = (props.opportunity ?? null) as any;
  const lastActionMeta = (props.lastActionMeta ?? null) as LastActionMetaV2 | null;

  // 👉 Href “actionnable” (si présent)
  const nextHref =
    (lastActionMeta?.nextHref ||
      props.nextHref ||
      props.urgentHref ||
      props.noreplyHref ||
      null) as string | null;

  const reportHref = props.reportHref || props.allHref || "/audit/report";

  // Détection d’un état “no context”
  const contextMissing =
    Boolean(props.contextMissing) ||
    (opportunity == null &&
      typeof props.contextMessage === "string" &&
      props.contextMessage.toLowerCase().includes("contexte"));

  // Détection d’un état “audit propre / vide”
  const isClean =
    Boolean(props.isEmpty) ||
    Boolean(props.auditClean) ||
    (!contextMissing && opportunity == null);

  // Déduire le mode final (3 états + no-context)
  let mode: Mode = "DETECTED";

  if (contextMissing) mode = "NO_CONTEXT";
  else if (isClean) mode = "CLEAN";
  else if (nextHref) mode = "ACTION";
  else mode = "DETECTED";

  // UI content helpers
  const oppTitle = String(opportunity?.title ?? opportunity?.name ?? "Opportunité détectée");
  const sev = Number(opportunity?.severity ?? opportunity?.priority ?? opportunity?.score ?? 0);
  const tag = severityToTag(sev);

  // CTA labels
  const actionLabel =
    lastActionMeta?.nextLabel || (nextHref ? "Traiter maintenant →" : "Voir les opportunités →");

  const actionHint =
    lastActionMeta?.nextHint ||
    (mode === "ACTION"
      ? "Ouvre la séquence guidée pour exécuter l’action."
      : "Sélectionne une action dans la liste pour continuer.");

  /* ==========================
     🟡 NO CONTEXT
     ========================== */
  if (mode === "NO_CONTEXT") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          ⚠️ Contexte requis
        </div>

        <h2 className="mt-4 text-3xl font-semibold text-white">Aucun contexte détecté</h2>

        <p className="mt-2 text-sm text-slate-300">
          Ouvre Auto-Pilot depuis Audit pour conserver le contexte de l’opportunité.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/audit"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            ← Revenir à Audit
          </Link>

          <Link
            href={reportHref}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Voir le dernier rapport →
          </Link>
        </div>
      </div>
    );
  }

  /* ==========================
     🟢 CLEAN (audit propre)
     ========================== */
  if (mode === "CLEAN") {
    return (
      <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          ✅ Audit propre
        </div>

        <h2 className="mt-4 text-4xl font-semibold text-white">Rien à faire maintenant</h2>
        <p className="mt-2 text-sm text-slate-300">
          Aucune action critique non traitée. Les activités récentes restent visibles plus bas.
        </p>

        <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-white/90 flex items-center justify-between">
            <span>Pourquoi je vois ce statut ?</span>
            <span className="text-white/40">▾</span>
          </summary>
          <p className="mt-2 text-xs text-slate-300">
            Le Hero passe en “audit propre” quand il n’y a aucune opportunité à exécuter immédiatement.
            Les nouvelles activités peuvent apparaître sans nécessiter d’action.
          </p>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={reportHref}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            🧾 Voir le dernier rapport
          </Link>

          <button
            type="button"
            onClick={() => scrollToOpportunities(opportunity?.id)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Voir la liste →
          </button>
        </div>

        {lastActionMeta?.summary ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-300">Dernière action</div>
            <div className="mt-1 text-sm font-semibold text-white">{lastActionMeta.summary}</div>
          </div>
        ) : null}
      </div>
    );
  }

  /* ==========================
     🟠 DETECTED (opportunité détectée)
     => IMPORTANT : PAS “À faire maintenant”
     ========================== */
  if (mode === "DETECTED") {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          🔍 Opportunité détectée
        </div>

        <h2 className="mt-4 text-4xl font-semibold text-white">Analyse prête</h2>

        <p className="mt-2 text-lg font-semibold text-white/90">{oppTitle}</p>
        <p className="mt-2 text-sm text-slate-300">{actionHint}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToOpportunities(opportunity?.id)}
            className="rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Voir les opportunités →
          </button>

          <Link
            href={reportHref}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Voir le rapport →
          </Link>
        </div>

        {lastActionMeta?.summary ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-300">Dernière action</div>
            <div className="mt-1 text-sm font-semibold text-white">{lastActionMeta.summary}</div>
          </div>
        ) : null}
      </div>
    );
  }

  /* ==========================
     🔴 ACTION (à faire maintenant)
     => CTA obligatoire (nextHref)
     ========================== */
  return (
    <div className="rounded-3xl border border-[#c33541]/35 bg-[#0b1220]/70 p-6 backdrop-blur">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#c33541]/35 bg-[#c33541]/10 px-3 py-1 text-xs font-semibold text-white/90">
        {tag}
      </div>

      <h2 className="mt-4 text-4xl font-semibold text-white">À faire maintenant</h2>

      <p className="mt-2 text-lg font-semibold text-white/90">{oppTitle}</p>
      <p className="mt-2 text-sm text-slate-300">{actionHint}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-xl bg-[#c33541] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => scrollToOpportunities(opportunity?.id)}
            className="rounded-xl bg-[#c33541] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Voir les opportunités →
          </button>
        )}

        <Link
          href={reportHref}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Voir le rapport →
        </Link>
      </div>

      {lastActionMeta?.summary ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-slate-300">Dernière action</div>
          <div className="mt-1 text-sm font-semibold text-white">{lastActionMeta.summary}</div>
        </div>
      ) : null}
    </div>
  );
}
