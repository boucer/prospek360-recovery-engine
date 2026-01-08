"use client";

import { useEffect, useMemo, useState } from "react";
import type { AutoPilotContext } from "@/lib/autopilot/types";
import AutoPilotButton, { type AutoPilotResult } from "./AutoPilotButton";

/* =========================
   Storage keys
========================= */
const AUTOPILOT_STORAGE_KEY = "prospek360.autopilot.lastResult";
const LAST_ACTION_STORAGE_KEY = "recovery:lastActionAt";
const LAST_ACTION_SUMMARY_KEY = "recovery:lastActionSummary";
const LAST_ACTION_META_KEY = "recovery:lastActionMeta";

// ✅ V1.5 prefs
const MSG_PREF_STYLE_KEY = "prospek360.autopilot.msgStyle"; // "short" | "direct"
const MSG_PREF_TONE_KEY = "prospek360.autopilot.msgTone"; // "soft" | "firm"

// ✅ V1.6 draft persistence per finding (optional)
const MSG_DRAFT_PREFIX = "prospek360.autopilot.msgDraft:";

const TOAST_OK = 1600;
const TOAST_ERR = 2000;

type InitialParams = Record<string, string | undefined>;

type DecisionPayload = {
  ok: boolean;
  decision?: {
    decision: "FOLLOW_UP_NOW" | "WAIT" | "ESCALATE" | "NEED_INFO" | "STOP";
    confidence: number;
    reasons: string[];
    guardrails?: string[];
    meta?: {
      ageDays: number;
      severity: number;
      valueCents: number;
      priorityTag: "URGENT" | "HIGH_ROI" | "QUICK_WIN" | "NORMAL";
    };
  };
};

type LastActionMeta = {
  summary: string;
  nextLabel?: string;
  nextHref?: string;
  nextHint?: string;
};

/* =========================
   Utils
========================= */
function emitToast(message: string, ms = TOAST_OK) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("recovery:toast", { detail: { message, ms } }));
}

function normalizeInitialParams(
  input?: Record<string, string | string[] | undefined> | null
): InitialParams | null {
  if (!input) return null;
  const out: InitialParams = {};
  for (const [k, v] of Object.entries(input)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}

function getParam(sp: URLSearchParams | null, params: InitialParams | null, key: string) {
  return (params?.[key] ?? sp?.get(key) ?? null) || null;
}

function getIsPremium(params: InitialParams | null) {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return getParam(sp, params, "premium") === "1";
}

function buildSafeCtxFromParams(params: InitialParams | null): AutoPilotContext {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const opportunityId = getParam(sp, params, "opportunityId") || "autopilot-global";
  const findingId = getParam(sp, params, "findingId") || undefined;

  return {
    opportunityId,
    findingId,
    contact: { email: "", phone: "" },
  } as AutoPilotContext;
}

function buildFocusMeta(params: InitialParams | null) {
  const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const title = getParam(sp, params, "title");
  const type = getParam(sp, params, "type");
  const valueRaw = getParam(sp, params, "value") || getParam(sp, params, "valueCents");
  const message =
    getParam(sp, params, "message") ||
    getParam(sp, params, "suggestedMessage") ||
    getParam(sp, params, "copyText");

  let valueCents: number | null = null;
  if (valueRaw) {
    const n = Number(valueRaw);
    if (Number.isFinite(n)) valueCents = n > 2000 ? Math.round(n) : Math.round(n * 100);
  }

  let impactLabel: string | null = null;
  if (valueCents && valueCents > 0) impactLabel = `${Math.round(valueCents / 100)} $`;

  return {
    title: title?.trim() || null,
    type: type?.trim() || null,
    impactLabel,
    valueCents: valueCents ?? null,
    message: message?.trim() || null,
  };
}

function readStoredResult(): AutoPilotResult | null {
  try {
    const raw = localStorage.getItem(AUTOPILOT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutoPilotResult;
  } catch {
    return null;
  }
}

function writeStoredResult(r: AutoPilotResult) {
  try {
    localStorage.setItem(AUTOPILOT_STORAGE_KEY, JSON.stringify(r));
  } catch {}
}

function clearStoredResult() {
  try {
    localStorage.removeItem(AUTOPILOT_STORAGE_KEY);
  } catch {}
}

function setLastActionNow(summary: string, meta?: LastActionMeta) {
  const ts = Date.now();
  try {
    localStorage.setItem(LAST_ACTION_STORAGE_KEY, String(ts));
    localStorage.setItem(LAST_ACTION_SUMMARY_KEY, summary);
    if (meta) localStorage.setItem(LAST_ACTION_META_KEY, JSON.stringify(meta));
  } catch {}
}

function confidenceLabel(c: number) {
  if (c >= 85) return `Très sûr · ${c}%`;
  if (c >= 70) return `Confiant · ${c}%`;
  if (c >= 55) return `Probable · ${c}%`;
  return `À valider · ${c}%`;
}

/* =========================
   V1.6 — TYPE + DECISION + STYLE + TONE + AUTO-FILL
========================= */

type TypeKey = "PAYMENT" | "INBOX" | "ACTIVATION" | "NO_SHOW" | "REVIEW" | "DEFAULT";
type MsgStyle = "short" | "direct";
type MsgTone = "soft" | "firm";

function normalizeType(raw?: string | null): TypeKey {
  if (!raw) return "DEFAULT";
  const t = raw.toUpperCase().replace(/\s+/g, "_");
  if (t.includes("PAY")) return "PAYMENT";
  if (t.includes("INBOX") || t.includes("REPLY") || t.includes("EMAIL")) return "INBOX";
  if (t.includes("ACTIV")) return "ACTIVATION";
  if (t.includes("NO_SHOW") || t.includes("NOSHOW") || t.includes("MISSED")) return "NO_SHOW";
  if (t.includes("REVIEW") || t.includes("AVIS")) return "REVIEW";
  return "DEFAULT";
}

function shortenTitle(t?: string | null) {
  if (!t) return "votre demande";
  const s = t.trim();
  return s.length <= 52 ? s : s.slice(0, 50) + "…";
}

function moneyHint(valueCents?: number | null) {
  if (!valueCents || valueCents <= 0) return "";
  const dollars = Math.round(valueCents / 100);
  return dollars >= 50 ? ` (≈ ${dollars}$)` : "";
}

function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    if (v && allowed.includes(v)) return v;
  } catch {}
  return fallback;
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function buildEnding(tone: MsgTone) {
  return tone === "firm"
    ? "Réponds avec “OK” et je le règle."
    : "Si tu veux, réponds “OK” et je m’en occupe.";
}

function buildAskCall(tone: MsgTone) {
  return tone === "firm" ? "On se parle 5 min maintenant?" : "Tu préfères un petit appel 5 minutes?";
}

type DecisionCode = NonNullable<DecisionPayload["decision"]>["decision"];

function generateMessageV16(args: {
  decisionCode: DecisionCode | null;
  typeKey: TypeKey;
  title: string | null;
  valueCents: number | null;
  confidence: number | null;
  style: MsgStyle;
  tone: MsgTone;
}) {
  const { decisionCode, typeKey, title, valueCents, confidence, style, tone } = args;
  const t = shortenTitle(title);
  const m = moneyHint(valueCents);
  const conf = typeof confidence === "number" ? `\n(Confiance: ${confidence}%)` : "";

  if (decisionCode === "STOP") return `Note interne — ${t}\nDéjà traité. Enchaîner.${conf}`;

  if (decisionCode === "NEED_INFO") {
    const head =
      typeKey === "PAYMENT"
        ? `Re: Paiement — ${t}${m}`
        : typeKey === "INBOX"
        ? `Re: ${t}`
        : typeKey === "ACTIVATION"
        ? `Activation — ${t}`
        : typeKey === "NO_SHOW"
        ? `Suivi — rendez-vous manqué`
        : typeKey === "REVIEW"
        ? `Avis — ${t}`
        : `Re: ${t}${m}`;

    if (style === "short") return `${head}\nJ’ai 2 infos rapides :\n1) [INFO #1]\n2) [INFO #2]${conf}`;

    if (typeKey === "PAYMENT") {
      return `${head}\nPour finaliser :\n1) Courriel de facturation? [INFO #1]\n2) Carte ou virement? [INFO #2]${conf}`;
    }
    if (typeKey === "NO_SHOW") {
      return `${head}\nOn replace ça :\n1) Quel jour? [INFO #1]\n2) Matin ou après-midi? [INFO #2]${conf}`;
    }
    return `${head}\nPour avancer :\n1) [INFO #1]\n2) [INFO #2]${conf}`;
  }

  if (decisionCode === "ESCALATE") {
    const end = buildAskCall(tone);
    if (style === "short") {
      if (typeKey === "PAYMENT") return `Prioritaire — paiement en attente${m}\n${end}${conf}`;
      if (typeKey === "REVIEW") return `Prioritaire — insatisfaction\n${end}${conf}`;
      return `Prioritaire — ${t}${m}\n${end}${conf}`;
    }

    if (typeKey === "PAYMENT") {
      return `Prioritaire — paiement${m}\nJe règle ça aujourd’hui. Tu veux un lien de paiement maintenant?${conf}`;
    }
    if (typeKey === "INBOX") {
      return `Prioritaire — réponse attendue\nJe peux répondre tout de suite. Appel 5 min ou je réponds ici?${conf}`;
    }
    if (typeKey === "ACTIVATION") {
      return `Prioritaire — activation\nDis “OK” et je te guide maintenant.${conf}`;
    }
    if (typeKey === "NO_SHOW") {
      return `Prioritaire — rendez-vous manqué\nJe te propose 2 créneaux aujourd’hui : A ou B?${conf}`;
    }
    if (typeKey === "REVIEW") {
      return `Prioritaire — ton avis\nJe veux corriger ça aujourd’hui. Appel 5 min ou solution par message?${conf}`;
    }
    return `Prioritaire — ${t}${m}\nAppel 5 min maintenant ou solution par message?${conf}`;
  }

  if (decisionCode === "WAIT") {
    const end = buildEnding(tone);
    if (style === "short") {
      if (typeKey === "PAYMENT") return `Petit rappel — paiement${m}\n${end}${conf}`;
      if (typeKey === "NO_SHOW") return `Suivi — rendez-vous manqué\n${end}${conf}`;
      return `Suivi — ${t}${m}\n${end}${conf}`;
    }

    if (typeKey === "PAYMENT") return `Paiement — ${t}${m}\nQuand tu es prêt, je te renvoie le lien. ${end}${conf}`;
    if (typeKey === "ACTIVATION") return `Activation — ${t}\nJe garde ça prêt. ${end}${conf}`;
    return `Suivi — ${t}${m}\nJe reviens au bon moment. ${end}${conf}`;
  }

  // FOLLOW_UP_NOW
  const end = buildEnding(tone);

  if (style === "short") {
    if (typeKey === "PAYMENT") return `Paiement — ${t}${m}\n${end}${conf}`;
    if (typeKey === "INBOX") return `Re: ${t}\n${buildAskCall(tone)}${conf}`;
    if (typeKey === "ACTIVATION") return `Activation — ${t}\n${end}${conf}`;
    if (typeKey === "NO_SHOW") return `Suivi — rendez-vous manqué\n${end}${conf}`;
    if (typeKey === "REVIEW") return `Suivi — ton avis\n${buildAskCall(tone)}${conf}`;
    return `Suivi — ${t}${m}\n${end}${conf}`;
  }

  if (typeKey === "PAYMENT") {
    return `Paiement — ${t}${m}\nJe peux finaliser en 2 minutes. Tu veux le lien de paiement maintenant?${conf}`;
  }
  if (typeKey === "INBOX") {
    return `Re: ${t}\nJe réponds tout de suite. Tu préfères ici ou un appel 5 min?${conf}`;
  }
  if (typeKey === "ACTIVATION") {
    return `Activation — ${t}\nJe peux l’activer maintenant. Réponds “OK” et je te guide.${conf}`;
  }
  if (typeKey === "NO_SHOW") {
    return `Suivi — rendez-vous manqué\nOn remet ça. Aujourd’hui ou demain?${conf}`;
  }
  if (typeKey === "REVIEW") {
    return `Suivi — ton avis\nJe veux corriger ça. Solution ici ou appel 5 min?${conf}`;
  }
  return `Suivi — ${t}${m}\nJe te propose une solution simple (2 minutes). Tu veux que je te l’envoie ici?${conf}`;
}

/* =========================
   V1.6 — Auto-fill placeholders
========================= */
function hasInfoPlaceholders(text: string) {
  return /\[INFO\s*#?1\]|\[INFO\s*#?2\]/i.test(text);
}

function suggestionsForType(typeKey: TypeKey) {
  switch (typeKey) {
    case "PAYMENT":
      return { info1: "Le courriel pour la facture", info2: "Carte (Visa/MC) ou virement Interac" };
    case "INBOX":
      return { info1: "Réponse courte ici (2 lignes)", info2: "À livrer aujourd’hui (sinon préciser la date)" };
    case "ACTIVATION":
      return { info1: "Accès admin / identifiant principal", info2: "Plage horaire idéale (jour/heure) pour activer" };
    case "NO_SHOW":
      return { info1: "Demain", info2: "Avant-midi (ou après-midi)" };
    case "REVIEW":
      return { info1: "Ce qui a déçu exactement (1 phrase)", info2: "Solution par message (ou appel 5 min)" };
    default:
      return { info1: "Détail manquant #1", info2: "Détail manquant #2" };
  }
}

function fillInfoPlaceholders(text: string, typeKey: TypeKey) {
  const { info1, info2 } = suggestionsForType(typeKey);
  let out = text;
  out = out.replace(/\[INFO\s*#?1\]/gi, info1);
  out = out.replace(/\[INFO\s*#?2\]/gi, info2);
  return out;
}

/* =========================
   UI bits
========================= */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#c33541] px-4 py-3 text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        active
          ? "border-[#c33541]/40 bg-[#c33541]/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StepRouterCard({
  decision,
  decisionLoading,
  draftMessage,
  isGenerated,
  typeKey,
  style,
  tone,
  setStyle,
  setTone,
  onChangeDraft,
  onInsertMissing,
  onCopy,
  copied,
  onQueue,
  onUnqueue,
  queued,
  queueBusy,
  auditHref,
}: {
  decision: DecisionPayload["decision"] | null;
  decisionLoading: boolean;
  draftMessage: string;
  isGenerated: boolean;
  typeKey: TypeKey;
  style: MsgStyle;
  tone: MsgTone;
  setStyle: (v: MsgStyle) => void;
  setTone: (v: MsgTone) => void;
  onChangeDraft: (v: string) => void;
  onInsertMissing: () => void;
  onCopy: () => Promise<void>;
  copied: boolean; // ✅ V1.6.1 feedback local
  onQueue: () => Promise<void>;
  onUnqueue: () => Promise<void>;
  queued: boolean;
  queueBusy: boolean;
  auditHref: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const code = decision?.decision || "FOLLOW_UP_NOW";
  const conf = typeof decision?.confidence === "number" ? decision!.confidence : null;

  const canCopy = !!draftMessage?.trim() && code !== "STOP";
  const hasMissing = hasInfoPlaceholders(draftMessage);

  const primary = (() => {
    if (code === "ESCALATE") {
      return {
        label: "🔥 Escalader maintenant (assisté)",
        hint: "Signal critique : validation humaine recommandée.",
        action: async () => emitToast("🔥 Vérifie le contexte puis exécute l’action manuelle.", TOAST_OK),
      };
    }
    if (code === "NEED_INFO") {
      return {
        label: hasMissing ? "🪄 Insérer champs manquants + copier" : "❓ Copier le message (clarification)",
        hint: "1–2 questions max. (Tu peux auto-remplir si tu veux.)",
        action: async () => {
          if (hasMissing) onInsertMissing();
          await onCopy();
        },
      };
    }
    if (code === "WAIT") {
      return {
        label: hasMissing ? "⏳ Insérer champs + mettre en file" : "⏳ Préparer + mettre en file",
        hint: "Prépare le message, puis suis le timing.",
        action: async () => {
          if (hasMissing) onInsertMissing();
          await onCopy();
          await onQueue();
        },
      };
    }
    if (code === "STOP") {
      return {
        label: "✅ Déjà traité — Retour Audit",
        hint: "Enchaîner la prochaine opportunité.",
        action: async () => {
          window.location.href = auditHref;
        },
      };
    }
    return {
      label: hasMissing ? "📋 Insérer champs + copier" : "📋 Copier le message + agir",
      hint: "Copie, envoie manuellement, puis mets en file.",
      action: async () => {
        if (hasMissing) onInsertMissing();
        await onCopy();
      },
    };
  })();

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-white/70">Action guidée (V1.6.1)</div>
        <div className="flex flex-wrap gap-2">
          {conf !== null ? <Pill>🧠 {confidenceLabel(conf)}</Pill> : null}
          <Pill>Type: {typeKey}</Pill>
          {isGenerated ? <Pill>✨ Message généré</Pill> : <Pill>📝 Message fourni</Pill>}
          {hasMissing ? <Pill>⚠️ Champs manquants</Pill> : null}
          {copied ? <Pill>✅ Copié</Pill> : null}
        </div>
      </div>

      {/* prefs */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-white/60">Style</span>
        <TogglePill active={style === "short"} label="Court" onClick={() => setStyle("short")} />
        <TogglePill active={style === "direct"} label="Direct" onClick={() => setStyle("direct")} />

        <span className="ml-2 text-xs font-semibold text-white/60">Ton</span>
        <TogglePill active={tone === "soft"} label="Soft" onClick={() => setTone("soft")} />
        <TogglePill active={tone === "firm"} label="Ferme" onClick={() => setTone("firm")} />

        {hasMissing ? <SecondaryButton onClick={onInsertMissing}>🪄 Insérer champs manquants</SecondaryButton> : null}
      </div>

      <div className="mt-2">
        {decisionLoading ? <div className="text-sm text-white/60">Analyse…</div> : <div className="text-sm text-white/75">{primary.hint}</div>}
      </div>

      <div className="mt-3">
        <PrimaryButton onClick={primary.action} disabled={decisionLoading || (!canCopy && code !== "STOP")}>
          {primary.label}
        </PrimaryButton>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SecondaryButton
  onClick={() => {
    window.location.href = auditHref;
  }}
>
  ↩ Retour Audit
</SecondaryButton>

        <SecondaryButton onClick={onQueue} disabled={queueBusy}>
          ✅ Mettre en file
        </SecondaryButton>
        <SecondaryButton onClick={onUnqueue} disabled={queueBusy || !queued}>
          ↩ Annuler
        </SecondaryButton>

        {queued ? (
          <span className="inline-flex items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200">
            ✅ En file
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="ml-auto text-xs text-white/55 hover:text-white/80 underline"
        >
          {showDetails ? "Masquer détails" : "Voir message"}
        </button>
      </div>

      {showDetails ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-white/70">Message (modifiable)</div>
              <div className="flex gap-2">
                {hasMissing ? <SecondaryButton onClick={onInsertMissing}>🪄 Insérer champs</SecondaryButton> : null}
                <SecondaryButton onClick={onCopy} disabled={!canCopy}>
                  {copied ? "✅ Copié !" : "📋 Copier"}
                </SecondaryButton>
              </div>
            </div>

            <textarea
              value={draftMessage}
              onChange={(e) => onChangeDraft(e.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 outline-none focus:border-white/20"
            />

            {isGenerated ? <div className="mt-2 text-[11px] text-white/55">Généré automatiquement. Tu peux ajuster avant envoi.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================
   Component
========================= */

export default function AutopilotClient({
  initialSearchParams,
}: {
  initialSearchParams?: Record<string, string | string[] | undefined>;
}) {
  const [isPremium, setIsPremium] = useState(false);
  const [ctx, setCtx] = useState<AutoPilotContext | null>(null);
  const [focusMeta, setFocusMeta] = useState(() => buildFocusMeta(null));

  const [result, setResult] = useState<AutoPilotResult | null>(() => readStoredResult());

  // Decision Engine
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decision, setDecision] = useState<DecisionPayload["decision"] | null>(null);

  // Queue state
  const [queueBusy, setQueueBusy] = useState(false);
  const [queued, setQueued] = useState(false);

  // prefs
  const [msgStyle, setMsgStyle] = useState<MsgStyle>("short");
  const [msgTone, setMsgTone] = useState<MsgTone>("soft");

  // message draft
  const [draftMessage, setDraftMessage] = useState<string>("");
  const [draftLocked, setDraftLocked] = useState(false);

  // ✅ feedback local copy (desktop safe)
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    setMsgStyle(readPref(MSG_PREF_STYLE_KEY, "short", ["short", "direct"] as const));
    setMsgTone(readPref(MSG_PREF_TONE_KEY, "soft", ["soft", "firm"] as const));

    const normalized = normalizeInitialParams(initialSearchParams);
    setIsPremium(getIsPremium(normalized));

    const builtCtx = buildSafeCtxFromParams(normalized);
    setCtx(builtCtx);

    const meta = buildFocusMeta(normalized);
    setFocusMeta(meta);

    if (!result) {
      const stored = readStoredResult();
      if (stored) setResult(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => writePref(MSG_PREF_STYLE_KEY, msgStyle), [msgStyle]);
  useEffect(() => writePref(MSG_PREF_TONE_KEY, msgTone), [msgTone]);

  useEffect(() => {
    let alive = true;

    async function loadDecision(findingId: string) {
      setDecisionLoading(true);
      try {
        const res = await fetch(`/api/recovery/decision?findingId=${encodeURIComponent(findingId)}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as DecisionPayload | null;
        if (!alive) return;

        if (res.ok && json?.ok && json.decision) setDecision(json.decision);
        else setDecision(null);
      } catch {
        if (!alive) return;
        setDecision(null);
      } finally {
        if (!alive) return;
        setDecisionLoading(false);
      }
    }

    if (ctx?.findingId) loadDecision(ctx.findingId);

    return () => {
      alive = false;
    };
  }, [ctx?.findingId]);

  const auditHref = ctx?.findingId ? `/audit?focus=${encodeURIComponent(ctx.findingId)}` : "/audit";
  const typeKey = useMemo(() => normalizeType(focusMeta.type), [focusMeta.type]);

  const templateMessage = useMemo(() => {
    const code = decision?.decision ?? null;
    const confidence = typeof decision?.confidence === "number" ? decision!.confidence : null;

    return generateMessageV16({
      decisionCode: code,
      typeKey,
      title: focusMeta.title,
      valueCents: focusMeta.valueCents,
      confidence,
      style: msgStyle,
      tone: msgTone,
    });
  }, [
    decision?.decision,
    decision?.confidence,
    typeKey,
    focusMeta.title,
    focusMeta.valueCents,
    msgStyle,
    msgTone,
  ]);

  const isGenerated = !(focusMeta.message?.trim());

  useEffect(() => {
    if (!ctx) return;

    const key = ctx.findingId ? `${MSG_DRAFT_PREFIX}${ctx.findingId}` : null;

    if (focusMeta.message?.trim()) {
      setDraftMessage(focusMeta.message.trim());
      setDraftLocked(true);
      return;
    }

    if (!draftLocked && key) {
      try {
        const saved = localStorage.getItem(key);
        if (saved && saved.trim()) {
          setDraftMessage(saved);
          return;
        }
      } catch {}
    }

    if (!draftLocked) setDraftMessage(templateMessage);
  }, [ctx, focusMeta.message, templateMessage, draftLocked]);

  useEffect(() => {
    if (!ctx?.findingId) return;
    try {
      localStorage.setItem(`${MSG_DRAFT_PREFIX}${ctx.findingId}`, draftMessage);
    } catch {}
  }, [ctx?.findingId, draftMessage]);

  const summary = useMemo(() => {
    if (!result) return null;
    const totalValue = result.totalValueCents ? result.totalValueCents / 100 : 0;
    const timeSaved = result.timeSavedMin || 0;
    return { totalValue, timeSaved };
  }, [result]);

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-sm text-white/70">Chargement de l’assistant…</p>
      </div>
    );
  }

  async function copyMessage() {
    const msg = (draftMessage || "").trim();
    if (!msg) {
      emitToast("⚠️ Aucun message à copier.", TOAST_ERR);
      return;
    }

    try {
      await navigator.clipboard.writeText(msg);

      // ✅ feedback local (desktop) + toast si disponible
      setCopied(true);
      emitToast("📋 Message copié.", TOAST_OK);
    } catch {
      emitToast("❌ Copie impossible.", TOAST_ERR);
    }
  }

  function insertMissingFields() {
    if (!draftMessage) return;
    if (!hasInfoPlaceholders(draftMessage)) {
      emitToast("✅ Rien à insérer.", TOAST_OK);
      return;
    }
    const next = fillInfoPlaceholders(draftMessage, typeKey);
    setDraftMessage(next);
    setDraftLocked(true);
    emitToast("🪄 Champs manquants insérés.", TOAST_OK);
  }

  async function queueAutopilot() {
  const c = ctx;
  if (!c || !c.findingId || queueBusy) {
    if (!c?.findingId) emitToast("❌ findingId manquant.", TOAST_ERR);
    return;
  }

  setQueueBusy(true);
  try {
    const res = await fetch(
      `/api/recovery-findings/${encodeURIComponent(c.findingId)}/queue-autopilot`,
      { method: "POST" }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error();

    setQueued(true);

    setLastActionNow("⚡ Auto-Pilot prêt — exécution assistée.", {
      summary:
        "Auto-Pilot a préparé la suite. Copie/colle le message, exécute l’action, puis reviens pour enchaîner la prochaine.",
      nextLabel: "↩ Retour Audit",
      nextHref: auditHref,
    });

    emitToast("✅ Mis en file Auto-Pilot.", TOAST_OK);
  } catch {
    emitToast("❌ Impossible de mettre en file.", TOAST_ERR);
  } finally {
    setQueueBusy(false);
  }
}


  async function unqueueAutopilot() {
  const c = ctx;
  if (!c || !c.findingId || queueBusy) {
    if (!c?.findingId) emitToast("❌ findingId manquant.", TOAST_ERR);
    return;
  }

  setQueueBusy(true);
  try {
    const res = await fetch(
      `/api/recovery-findings/${encodeURIComponent(c.findingId)}/unqueue-autopilot`,
      { method: "POST" }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error();

    setQueued(false);
    emitToast("↩ File Auto-Pilot annulée.", TOAST_OK);
  } catch {
    emitToast("❌ Impossible d’annuler.", TOAST_ERR);
  } finally {
    setQueueBusy(false);
  }
}


  return (
    <div className="space-y-6">
      {(focusMeta.title || focusMeta.type || focusMeta.impactLabel) && (
        <div className="rounded-2xl border border-[#c33541]/35 bg-slate-950/35 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/60">Contexte importé depuis Audit</p>
              <h2 className="mt-1 truncate text-lg font-extrabold text-white">
                {focusMeta.title || focusMeta.type || "Action prioritaire"}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {focusMeta.type ? <Pill>{focusMeta.type}</Pill> : null}
                {focusMeta.impactLabel ? <Pill>💰 Impact ≈ {focusMeta.impactLabel}</Pill> : null}
                <Pill>TypeKey: {typeKey}</Pill>
                {isGenerated ? <Pill>✨ Message généré</Pill> : <Pill>📝 Message fourni</Pill>}
              </div>
            </div>

            <a
              href={auditHref}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              ← Retour Audit
            </a>
          </div>

          <StepRouterCard
            decision={decision}
            decisionLoading={decisionLoading}
            draftMessage={draftMessage}
            isGenerated={isGenerated}
            typeKey={typeKey}
            style={msgStyle}
            tone={msgTone}
            setStyle={(v) => {
              setMsgStyle(v);
              if (!draftLocked && !focusMeta.message?.trim()) setDraftMessage(templateMessage);
            }}
            setTone={(v) => {
              setMsgTone(v);
              if (!draftLocked && !focusMeta.message?.trim()) setDraftMessage(templateMessage);
            }}
            onChangeDraft={(v) => {
              setDraftMessage(v);
              setDraftLocked(true);
            }}
            onInsertMissing={insertMissingFields}
            onCopy={copyMessage}
            copied={copied}
            onQueue={queueAutopilot}
            onUnqueue={unqueueAutopilot}
            queued={queued}
            queueBusy={queueBusy}
            auditHref={auditHref}
          />
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(900px_500px_at_20%_10%,rgba(195,53,65,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_30%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Pill>⚡ Auto-Pilot</Pill>
              <h2 className="mt-3 text-2xl font-extrabold text-white">Exécution guidée</h2>
              <p className="mt-1 text-sm text-white/70">
                Lance l’assistant. Il enchaîne les étapes de récupération, et te confirme chaque action.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <div className="text-xs font-semibold text-white/80">Assisté (V1)</div>
                <div className="mt-1 text-sm text-white/70">Aucun envoi automatique. Tu gardes le contrôle.</div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <AutoPilotButton
              ctx={ctx}
              onDone={(r) => {
                setResult(r);
                writeStoredResult(r);
                setLastActionNow("⚡ Auto-Pilot exécuté (assisté).", {
                  summary:
                    "Auto-Pilot a terminé la séquence guidée. Retourne au moteur pour enchaîner la prochaine opportunité.",
                  nextLabel: "↩ Retour Audit",
                  nextHref: auditHref,
                });
              }}
            />
          </div>

          {result ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  clearStoredResult();
                }}
                className="text-xs text-white/50 hover:text-white/80 underline"
              >
                Effacer le dernier résultat
              </button>
            </div>
          ) : null}

          {result ? (
            <div className="mt-6 animate-[fadeInUp_.25s_ease-out] space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/60">Valeur récupérable</p>
                  <p className="mt-1 text-lg font-extrabold text-white">
                    {new Intl.NumberFormat("fr-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    }).format(summary?.totalValue || 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/60">Temps économisé</p>
                  <p className="mt-1 text-lg font-extrabold text-white">{summary?.timeSaved || 0} min</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/60">Valeur</p>
                  <p className="mt-1 text-lg font-extrabold text-white">{summary?.totalValue || 0} $</p>
                </div>
              </div>

              {!isPremium ? (
                <div className="rounded-xl border border-[#c33541]/25 bg-[#c33541]/10 p-3">
                  <p className="text-sm font-semibold text-white">🔒 Certaines actions sont limitées (Free)</p>
                  <p className="mt-1 text-sm text-white/70">Débloque Premium pour une prise en charge complète.</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <a
                  href={auditHref}
                  className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  ↩ Retour Audit (enchaîner)
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
