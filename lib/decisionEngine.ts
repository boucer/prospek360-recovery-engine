// lib/decisionEngine.ts
import type { Opportunity } from "@/lib/audit/types";

export type DecisionCode =
  | "FOLLOW_UP_NOW"
  | "WAIT"
  | "ESCALATE"
  | "NEED_INFO"
  | "STOP";

export type DecisionResult = {
  decision: DecisionCode;
  confidence: number; // 0-100
  reasons: string[]; // 2-4 max (UI-friendly)
  guardrails?: string[];
  meta?: {
    ageDays: number;
    severity: number;
    valueCents: number;
    priorityTag: "URGENT" | "HIGH_ROI" | "QUICK_WIN" | "NORMAL";
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function computePriorityTag(severity: number, valueCents: number) {
  // Ajustable, mais stable V1
  if (severity >= 90) return "URGENT";
  if (severity >= 70 || valueCents >= 250_000) return "HIGH_ROI";
  if (severity >= 50 || valueCents >= 100_000) return "QUICK_WIN";
  return "NORMAL";
}

function textIncludesAny(text: string, needles: string[]) {
  const t = (text ?? "").toLowerCase();
  return needles.some((n) => t.includes(n));
}

/**
 * Decision Engine V1 — deterministic, explainable, UI-friendly
 * Entrées minimales (Opportunity + âge) -> décision + pourquoi.
 */
export function computeDecisionV1(input: {
  opportunity: Opportunity;
  ageDays: number;
  now?: Date;
}): DecisionResult {
  const o: any = input.opportunity as any;

  const ageDays = Math.max(0, Number.isFinite(input.ageDays) ? input.ageDays : 0);
  const severity = Number.isFinite(o.severity) ? Number(o.severity) : 0;
  const valueCents = Number.isFinite(o.valueCents) ? Number(o.valueCents) : 0;

  const title = String(o.title ?? o.name ?? "");
  const desc = String(o.description ?? "");
  const action = String(o.action ?? "");
  const blob = `${title}\n${desc}\n${action}`.toLowerCase();

  const handled = Boolean(o.handled);
  const handledAt = o.handledAt ? new Date(o.handledAt) : null;

  // --- Hard guards ---
  if (handled) {
    return {
      decision: "STOP",
      confidence: 92,
      reasons: [
        "Déjà marqué comme traité.",
        handledAt ? `Traité le ${handledAt.toLocaleDateString("fr-CA")}.` : "Traité récemment.",
      ].slice(0, 4),
      meta: {
        ageDays,
        severity,
        valueCents,
        priorityTag: "NORMAL",
      },
    };
  }

  // --- Signals / heuristics ---
  const mentionsNoReply = textIncludesAny(blob, [
    "sans réponse",
    "sans reponse",
    "aucune réponse",
    "aucune reponse",
    "pas de réponse",
    "pas de reponse",
    "no reply",
    "aucun suivi",
  ]);

  const mentionsNeedInfo = textIncludesAny(blob, [
    "manque",
    "incomplet",
    "à valider",
    "a valider",
    "besoin d'info",
    "besoin d’informations",
    "besoin d'informations",
    "missing",
    "need info",
  ]);

  const mentionsEscalate = textIncludesAny(blob, [
    "annulation",
    "chargeback",
    "litige",
    "refund",
    "rembourse",
    "remboursement",
    "plainte",
    "avocat",
    "urgence",
    "critique",
  ]);

  const mentionsWaitWindow = textIncludesAny(blob, [
    "attendre",
    "relancer plus tard",
    "créneau",
    "creneau",
    "disponibilité",
    "disponibilite",
  ]);

  const highValue = valueCents >= 250_000;
  const mediumValue = valueCents >= 100_000;

  const stale = ageDays >= 7;
  const warm = ageDays >= 2;

  const priorityTag = computePriorityTag(severity, valueCents);

  // --- Decision selection (ordered) ---
  // 1) Escalate
  if (mentionsEscalate || severity >= 92) {
    const reasons: string[] = [];
    reasons.push("Signal critique détecté (escalade recommandée).");
    if (severity >= 92) reasons.push(`Sévérité très élevée (${severity}/100).`);
    if (highValue) reasons.push(`Impact potentiel élevé (${formatCADCompact(valueCents)}).`);

    return {
      decision: "ESCALATE",
      confidence: clamp(78 + Math.floor(severity / 6), 78, 96),
      reasons: reasons.slice(0, 4),
      guardrails: ["Priorité : humain / validation avant automation."],
      meta: { ageDays, severity, valueCents, priorityTag },
    };
  }

  // 2) Need info
  if (mentionsNeedInfo) {
    return {
      decision: "NEED_INFO",
      confidence: clamp(72 + Math.floor(severity / 10), 72, 90),
      reasons: [
        "Informations manquantes pour exécuter correctement.",
        warm ? `Ouvert depuis ${ageDays} jours (à clarifier vite).` : "Clarifier avant de relancer.",
        mediumValue ? `Impact détecté (${formatCADCompact(valueCents)}).` : "Réduit les risques d’aller-retour.",
      ].filter(Boolean).slice(0, 4),
      guardrails: ["Poser 1–2 questions max (pas de roman)."],
      meta: { ageDays, severity, valueCents, priorityTag },
    };
  }

  // 3) Wait (soft hold)
  if (mentionsWaitWindow && !stale && severity < 70 && !highValue) {
    return {
      decision: "WAIT",
      confidence: 68,
      reasons: [
        "Fenêtre / créneau mentionné : éviter la relance trop tôt.",
        warm ? `Âge ${ageDays} jours : garde le timing propre.` : "Timing encore frais.",
        "Prépare le message, envoie au bon moment.",
      ].slice(0, 4),
      guardrails: ["Évite les doubles relances rapprochées."],
      meta: { ageDays, severity, valueCents, priorityTag },
    };
  }

  // 4) Follow up now (default action)
  {
    const base =
      (severity >= 70 ? 78 : severity >= 50 ? 72 : 64) +
      (highValue ? 10 : mediumValue ? 6 : 0) +
      (stale ? 6 : warm ? 3 : 0) +
      (mentionsNoReply ? 4 : 0);

    const confidence = clamp(base, 60, 95);

    const reasons: string[] = [];
    if (severity >= 70) reasons.push(`Priorité élevée (sévérité ${severity}/100).`);
    else if (severity >= 50) reasons.push(`Priorité détectée (sévérité ${severity}/100).`);
    else reasons.push("Prochaine action recommandée pour garder le système net.");

    if (valueCents > 0) reasons.push(`Impact estimé : ${formatCADCompact(valueCents)}.`);
    if (stale) reasons.push(`Ouvert depuis ${ageDays} jours : risque de refroidissement.`);
    else if (warm) reasons.push(`Ouvert depuis ${ageDays} jours : bon timing pour agir.`);

    if (mentionsNoReply) reasons.push("Aucun retour détecté : relance courte recommandée.");

    return {
      decision: "FOLLOW_UP_NOW",
      confidence,
      reasons: reasons.slice(0, 4),
      guardrails: ["Message court. 1 intention. 1 question."],
      meta: { ageDays, severity, valueCents, priorityTag },
    };
  }
}
