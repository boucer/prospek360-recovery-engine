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

type DecisionPayload = {
  ok: boolean;
  decision?: {
    code: "GO" | "WAIT" | "STOP";
    confidence: number;
    label: string;
    hint: string;
    reasons?: string[];
    guardrails?: string[];
    meta?: {
      ageDays: number;
      severity: number;
      valueCents: number;
      priorityTag: PriorityTag;
    };
  };
};

function emitToast(message: string, ms = 2800) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("recovery:toast", { detail: { message, ms } })
  );
}

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

function getPriority(opportunity: Opportunity) {
  const o: any = opportunity as any;
  const valueCents = (o.valueCents ?? 0) as number;
  if (valueCents >= 250000) return "HIGH_ROI";
  if (valueCents >= 100000) return "URGENT";
  if (valueCents >= 50000) return "QUICK_WIN";
  return "NORMAL";
}

/** ✅ Accordéon simple, fermé par défaut */
function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <div className="text-sm font-semibold text-white/90">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-white/60">{subtitle}</div>
          ) : null}
        </div>

        <span
          className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/80 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function SectionBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-semibold text-white/70">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * ✅ IMPORTANT:
 * - Auto-Pilot a besoin de findingId pour "mettre en file".
 * - Dans ton projet, l'id "cmk..." sert souvent pour les routes /recovery-findings/{id} (donc finding).
 * - Donc si on n'a pas de findingId explicite, on fallback à opportunityId.
 */
function buildAutopilotHref(opportunity: Opportunity) {
  const o: any = opportunity as any;

  const opportunityId = String(o.opportunityId ?? o.recoveryId ?? o.id ?? "");

  const findingId =
    String(
      o.findingId ??
        o.recoveryFindingId ??
        o.recoveryFinding?.id ??
        o.finding?.id ??
        ""
    ) || opportunityId; // ✅ fallback clé (corrige "findingId manquant")

  const title = o.title || o.name || "Prochaine action";
  const type = o.typeCode || o.type || o.typeKey || "DEFAULT";
  const valueCents = String(o.valueCents ?? 0);

  const message = o.recommendedMessage || o.message || o.suggestedMessage || "";

  const sp = new URLSearchParams();
  if (opportunityId) sp.set("opportunityId", String(opportunityId));
  if (findingId) sp.set("findingId", String(findingId));
  sp.set("title", String(title));
  sp.set("type", String(type));
  sp.set("valueCents", String(valueCents));
  if (message) sp.set("message", String(message));

  return `/autopilot?${sp.toString()}`;
}

export default function NextBestActionHero({
  opportunity,
  decisionLoading,
  decision,
  onCopy,
  onMarkTreated,
  onMarkHandledDirect,
  lastAction,
}: {
  opportunity: Opportunity | null;
  decisionLoading: boolean;
  decision: DecisionPayload["decision"] | null;

  onCopy?: () => void;

  // CTA principal (compat) = "mettre en file"
  onMarkTreated?: () => void;

  // optionnel : "j'ai déjà traité"
  onMarkHandledDirect?: () => void;

  lastAction?: LastActionMeta | null;
}) {
  if (!opportunity) return null;

  const o: any = opportunity as any;
  const title = o.title || o.name || "Prochaine action";
  const valueCents = (o.valueCents ?? 0) as number;
  const priority = getPriority(opportunity);

  // state local immédiat (UI instant)
  const [queuedLocal, setQueuedLocal] = React.useState(false);
  React.useEffect(() => setQueuedLocal(false), [o?.id]);

  const autopilotQueuedFromData = Boolean(
    (opportunity as any)?.autopilotQueued ||
      (opportunity as any)?.autopilotQueuedAt
  );

  const autopilotQueued = autopilotQueuedFromData || queuedLocal;

  const reasons = decision?.reasons || [];
  const guardrails = decision?.guardrails || [];

  const guidanceSteps: string[] = [
    "Copie le message recommandé (bouton 📋 Copier).",
    "Exécute l’action dans le canal approprié (SMS / email / appel) — rien n’est envoyé automatiquement.",
    "Mets-le en file Auto-Pilot pour suivre l’exécution.",
    "Reviens pour enchaîner la prochaine action (momentum).",
  ];

  const autopilotHref = buildAutopilotHref(opportunity);

  async function handleQueueAndGo() {
    setQueuedLocal(true);
    emitToast("✅ Mis en file. Ouverture d’Auto-Pilot…", 2200);

    // queue réelle côté serveur (si branché)
    try {
      onMarkTreated?.();
    } catch {
      // no-op
    }

    // redirige tout de suite vers le contexte (l’utilisateur avance)
    setTimeout(() => {
      window.location.href = autopilotHref;
    }, 320);
  }

  function handleOpenAutopilot() {
    emitToast("⚡ Ouverture d’Auto-Pilot…", 1800);
    window.location.href = autopilotHref;
  }

  return (
    <div className="rounded-3xl border border-[#c33541]/35 bg-[#0b1220]/70 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          ✅ NEXT ACTION
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-white/70">
            Audit
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/audit"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Voir l’historique
          </Link>
        </div>
      </div>

      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
        À faire maintenant
      </h2>
      <p className="mt-2 text-lg font-semibold text-white/90">{title}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold">
          💰 Impact : {formatCADCompact(valueCents)}
        </span>

        {autopilotQueued ? (
          <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">
            ⚡ En file Auto-Pilot
          </span>
        ) : null}
      </div>

      {/* ✅ Why / Guardrails / Guidance conservés (accordéon fermé par défaut) */}
      <Accordion
        title="Pourquoi / Guardrails / Guidance"
        subtitle="Clique pour ouvrir — réduit le scroll, mais garde l’intelligence accessible."
        defaultOpen={false}
      >
        <SectionBlock label="Pourquoi cette action">
          {decisionLoading ? (
            <div className="text-sm text-white/70">Analyse en cours…</div>
          ) : reasons.length ? (
            <ul className="list-disc pl-5 text-sm text-white/85">
              {reasons.slice(0, 5).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/70">
              Pas de raisons spécifiques détectées — on suit la prochaine meilleure
              action.
            </div>
          )}
        </SectionBlock>

        <div className="mt-3">
          <SectionBlock label="Guardrails (sécurité & contrôle)">
            {guardrails.length ? (
              <ul className="list-disc pl-5 text-sm text-white/80">
                {guardrails.slice(0, 5).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/70">
                Rien n’est envoyé automatiquement. Tu valides chaque action.
              </div>
            )}
          </SectionBlock>
        </div>

        <div className="mt-3">
          <SectionBlock label="Guide d’action (quoi faire maintenant)">
            <ol className="list-decimal pl-5 text-sm text-white/85">
              {guidanceSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>

            {decision?.hint ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                <span className="font-semibold text-white/80">Indice</span> :{" "}
                {decision.hint}
              </div>
            ) : null}
          </SectionBlock>
        </div>
      </Accordion>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {/* ✅ CTA principal : si déjà en file -> Ouvrir Auto-Pilot (pas de cul-de-sac) */}
        <button
          type="button"
          onClick={autopilotQueued ? handleOpenAutopilot : handleQueueAndGo}
          disabled={decisionLoading}
          className="rounded-2xl bg-[#c33541] px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(195,53,65,0.25)] hover:bg-[#d43f4b] disabled:opacity-60"
        >
          {autopilotQueued ? "⚡ Ouvrir Auto-Pilot" : "⚡ Mettre en file Auto-Pilot"}
        </button>

        {onCopy ? (
          <button
            type="button"
            onClick={() => {
              onCopy();
              emitToast("📋 Message copié.", 2400);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            📋 Copier
          </button>
        ) : null}

        {onMarkHandledDirect ? (
          <button
            type="button"
            onClick={() => {
              onMarkHandledDirect();
              emitToast("✅ Marqué comme traité.", 2400);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            ✅ Déjà traité
          </button>
        ) : null}

        {priority ? (
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
            {priority}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-white/55">
        Prochaine étape : copie le message → exécute l’action → Auto-Pilot s’ouvre sur
        ce billet.
      </p>

      {lastAction ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">Dernière action</div>
          <div className="mt-1 text-sm text-white/80">{lastAction.summary}</div>

          {lastAction.nextHref ? (
            <div className="mt-3">
              <a
                href={lastAction.nextHref}
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                {lastAction.nextLabel || "Continuer"}
              </a>
              {lastAction.nextHint ? (
                <div className="mt-1 text-xs text-white/60">
                  {lastAction.nextHint}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
