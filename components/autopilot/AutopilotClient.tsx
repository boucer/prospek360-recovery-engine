"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type MsgStyle = "short" | "direct" | "normal" | "long";
type MsgTone = "soft" | "firm" | "neutral";

type InitialParams = {
  opportunityId?: string;
  findingId?: string;
  title?: string;
  type?: string;
  valueCents?: string;
  message?: string;
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
  };
};

function safeDecode(v?: string | null) {
  if (!v) return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
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

function normalizeRecord(
  input?: Record<string, string | string[] | undefined> | null
): InitialParams | null {
  if (!input) return null;
  const pick = (k: string) => {
    const v = input[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const out: InitialParams = {
    opportunityId: pick("opportunityId"),
    findingId: pick("findingId"),
    title: pick("title"),
    type: pick("type"),
    valueCents: pick("valueCents"),
    message: pick("message"),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function normalizeSearchParams(sp: URLSearchParams | null): InitialParams | null {
  if (!sp) return null;
  const get = (k: string) => sp.get(k) ?? undefined;
  const out: InitialParams = {
    opportunityId: get("opportunityId"),
    findingId: get("findingId"),
    title: get("title"),
    type: get("type"),
    valueCents: get("valueCents"),
    message: get("message"),
  };
  return Object.values(out).some(Boolean) ? out : null;
}

function buildDefaultMessage(args: {
  title: string;
  typeKey: string;
  valueCents: number;
  style: MsgStyle;
  tone: MsgTone;
}) {
  const { title, typeKey, valueCents, style, tone } = args;
  const v = formatCADCompact(valueCents);

  const hello =
    tone === "soft" ? "Salut [Prénom]," : tone === "firm" ? "Bonjour [Prénom]," : "Bonjour [Prénom],";

  const close =
    tone === "soft" ? "Merci 🙂\n[Signature]" : "Merci,\n[Signature]";

  const typeLine =
    typeKey === "HIGH_INTENT_NO_FOLLOWUP"
      ? "Je voulais faire un suivi rapide suite à ton intérêt."
      : typeKey === "NO_REPLY_7D"
      ? "Je fais un petit suivi, je n’ai pas eu de retour."
      : typeKey === "MISSED_CALL"
      ? "On a manqué ton appel — je veux m’assurer de t’aider rapidement."
      : typeKey === "QUOTE_FOLLOWUP"
      ? "Je fais un suivi sur la soumission / la proposition."
      : "Je fais un suivi rapide.";

  if (style === "short") {
    return `${hello}\n\n${typeLine}\n\nEst-ce que tu préfères qu’on en parle 2 minutes aujourd’hui ou demain?\n\n${close}`;
  }
  if (style === "direct") {
    return `${hello}\n\n${typeLine}\n\n✅ On se cale un moment? Voici 2 choix :\n1) Aujourd’hui [Heure]\n2) Demain [Heure]\n\nRéponds simplement “1” ou “2”.\n\n${close}`;
  }
  if (style === "long") {
    return `${hello}\n\n${typeLine}\n\nJ’ai noté ceci côté dossier : “${title}”.\nImpact estimé : ${v}.\n\nJe te propose un mini point (5–8 min) pour valider le meilleur prochain pas.\nTu préfères aujourd’hui ou demain?\n\n${close}`;
  }
  return `${hello}\n\n${typeLine}\n\nJ’ai noté : “${title}”.\nEst-ce que tu veux que je te propose 2 créneaux?\n\n${close}`;
}

/** ✅ Toast local (visible même si aucun provider global) */
function LocalToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-5 right-5 z-[200] max-w-[360px] rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm font-semibold text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur">
      {message}
    </div>
  );
}

export default function AutopilotClient({
  initialParams,
}: {
  initialParams?: Record<string, string | string[] | undefined> | null;
}) {
  const sp = useSearchParams();

  const fromRecord = useMemo(() => normalizeRecord(initialParams), [initialParams]);
  const fromUrl = useMemo(() => normalizeSearchParams(sp), [sp]);
  const params = fromRecord ?? fromUrl;

  const ctx = useMemo(() => {
    if (!params) return null;
    return {
      opportunityId: params.opportunityId || "",
      findingId: params.findingId || "",
      title: safeDecode(params.title) || "Prochaine action",
      typeKey: safeDecode(params.type) || "DEFAULT",
      valueCents: Number(params.valueCents || 0),
      message: safeDecode(params.message),
    };
  }, [params]);

  const auditHref = ctx?.opportunityId ? `/audit?focus=${encodeURIComponent(ctx.opportunityId)}` : "/audit";

  const [msgStyle, setMsgStyle] = useState<MsgStyle>("short");
  const [msgTone, setMsgTone] = useState<MsgTone>("soft");

  const [draftMessage, setDraftMessage] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);

  const [queued, setQueued] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decision, setDecision] = useState<DecisionPayload["decision"] | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const firstHydrateDone = useRef(false);

  function showToast(msg: string, ms = 2600) {
    setToast(msg);
    try {
      // si jamais tu as un listener global ailleurs, on le déclenche aussi
      window.dispatchEvent(new CustomEvent("recovery:toast", { detail: { message: msg, ms } }));
    } catch {}
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }

  // ✅ Hydrate message à l’arrivée (ou régénère si absent)
  useEffect(() => {
    if (!ctx) return;

    if (ctx.message?.trim()) {
      setDraftMessage(ctx.message);
      setDraftDirty(false);
      firstHydrateDone.current = true;
      return;
    }

    const generated = buildDefaultMessage({
      title: ctx.title,
      typeKey: ctx.typeKey,
      valueCents: ctx.valueCents,
      style: msgStyle,
      tone: msgTone,
    });

    setDraftMessage(generated);
    setDraftDirty(false);
    firstHydrateDone.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.opportunityId]);

  // ✅ Style/Ton régénèrent si l’utilisateur n’a pas modifié (dirty=false)
  useEffect(() => {
    if (!ctx) return;
    if (!firstHydrateDone.current) return;
    if (draftDirty) return;

    const generated = buildDefaultMessage({
      title: ctx.title,
      typeKey: ctx.typeKey,
      valueCents: ctx.valueCents,
      style: msgStyle,
      tone: msgTone,
    });

    setDraftMessage(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgStyle, msgTone]);

  // ✅ Decision (optionnel)
  async function fetchDecision() {
    if (!ctx) return;
    setDecisionLoading(true);
    try {
      const res = await fetch("/api/recovery/autopilot-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeKey: ctx.typeKey,
          valueCents: ctx.valueCents,
          style: msgStyle,
          tone: msgTone,
          hasMessage: Boolean(draftMessage.trim()),
        }),
      });

      const json = (await res.json().catch(() => null)) as DecisionPayload | null;
      if (!json?.ok) throw new Error();
      setDecision(json.decision || null);
    } catch {
      setDecision(null);
    } finally {
      setDecisionLoading(false);
    }
  }

  useEffect(() => {
    fetchDecision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.typeKey, ctx?.valueCents, msgStyle, msgTone]);

  async function copyMessage() {
    const msg = draftMessage.trim();
    if (!msg) return showToast("⚠️ Aucun message à copier.", 3200);
    try {
      await navigator.clipboard.writeText(msg);
      showToast("📋 Message copié.", 2200);
    } catch {
      showToast("❌ Copie impossible (permission navigateur).", 3800);
    }
  }

  async function queueAutopilot() {
    if (!ctx?.findingId) {
      showToast("❌ findingId manquant : lien Audit→Auto-Pilot incomplet.", 4200);
      return;
    }
    if (!draftMessage.trim()) {
      showToast("⚠️ Ajoute un message avant de mettre en file.", 3200);
      return;
    }

    setQueueBusy(true);
    try {
      const res = await fetch(
        `/api/recovery-findings/${encodeURIComponent(ctx.findingId)}/queue-autopilot`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();

      setQueued(true);
      showToast("✅ Mis en file Auto-Pilot.", 2600);
    } catch {
      showToast("❌ Impossible de mettre en file.", 4200);
    } finally {
      setQueueBusy(false);
    }
  }

  async function unqueueAutopilot() {
    if (!ctx?.findingId) return;
    setQueueBusy(true);
    try {
      const res = await fetch(
        `/api/recovery-findings/${encodeURIComponent(ctx.findingId)}/unqueue-autopilot`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();

      setQueued(false);
      showToast("↩ Retiré de la file.", 2400);
    } catch {
      showToast("❌ Impossible de retirer.", 4200);
    } finally {
      setQueueBusy(false);
    }
  }

  if (!ctx) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
          ⚠️ Aucun contexte détecté. Ouvre Auto-Pilot depuis Audit.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-10">
      {toast ? <LocalToast message={toast} /> : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-white/70">Contexte importé depuis Audit</div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              {(decision?.code || "WAIT").toUpperCase()}
            </span>
            <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              💰 Impact ≈ {formatCADCompact(ctx.valueCents)}
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              TypeKey: {ctx.typeKey}
            </span>
            {queued ? (
              <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                ⚡ En file
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{ctx.title}</h1>
            <div className="mt-1 text-sm text-white/60">
              Probable : {Math.round((decision?.confidence || 0) * 100)}%
            </div>
          </div>

          <button
            type="button"
            onClick={() => (window.location.href = auditHref)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← Retour Audit
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white/85">Action guidée (V1.6.1)</div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span className="mr-1 font-semibold text-white/80">Style</span>
            {(["short", "direct", "normal", "long"] as MsgStyle[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMsgStyle(s)}
                className={`rounded-full border px-3 py-1 font-semibold ${
                  msgStyle === s
                    ? "border-[#c33541]/50 bg-[#c33541]/10 text-white"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {s === "short" ? "Court" : s === "direct" ? "Direct" : s === "normal" ? "Normal" : "Long"}
              </button>
            ))}

            <span className="ml-2 mr-1 font-semibold text-white/80">Ton</span>
            {(["soft", "firm", "neutral"] as MsgTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMsgTone(t)}
                className={`rounded-full border px-3 py-1 font-semibold ${
                  msgTone === t
                    ? "border-[#c33541]/50 bg-[#c33541]/10 text-white"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {t === "soft" ? "Soft" : t === "firm" ? "Ferme" : "Neutre"}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setDraftDirty(false);
                setDraftMessage(
                  buildDefaultMessage({
                    title: ctx.title,
                    typeKey: ctx.typeKey,
                    valueCents: ctx.valueCents,
                    style: msgStyle,
                    tone: msgTone,
                  })
                );
                showToast("✨ Message régénéré.", 2200);
              }}
              className="ml-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
            >
              ✨ Régénérer
            </button>
          </div>

          <div className="mt-3 text-sm text-white/75">
            {decisionLoading ? "Analyse…" : decision?.hint || "Ajoute d’abord un message, puis mets en file."}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={queueAutopilot}
              disabled={queueBusy || decisionLoading || queued}
              className="w-full rounded-2xl bg-[#c33541] px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(195,53,65,0.25)] hover:bg-[#d43f4b] disabled:opacity-60"
            >
              {queued ? "✅ Déjà en file Auto-Pilot" : "⚡ Mettre en file Auto-Pilot"}
            </button>
          </div>

          <p className="mt-2 text-xs text-white/55">
            Prochaine étape : copie le message → exécute l’action → reviens ici pour enchaîner.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">Message (modifiable)</div>
              <textarea
                value={draftMessage}
                onChange={(e) => {
                  setDraftMessage(e.target.value);
                  setDraftDirty(true);
                }}
                rows={10}
                className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
              />
              <div className="mt-2 text-xs text-white/50">
                Astuce : remplace [Prénom] / [Signature], puis copie-colle.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyMessage}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                📋 Copier
              </button>

              {queued ? (
                <button
                  type="button"
                  onClick={unqueueAutopilot}
                  disabled={queueBusy}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                >
                  ↩ Retirer de la file
                </button>
              ) : null}

              <div className="text-xs text-white/45">Copie le message avant envoi.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
