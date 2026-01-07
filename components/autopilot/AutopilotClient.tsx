"use client";

import { useEffect, useMemo, useState } from "react";
import type { AutoPilotContext } from "@/lib/autopilot/types";
import AutoPilotButton, { type AutoPilotResult } from "./AutoPilotButton";

/* =========================
   Utils
========================= */

const AUTOPILOT_STORAGE_KEY = "prospek360.autopilot.lastResult";

type InitialParams = Record<string, string | undefined>;

function normalizeInitialParams(
  input?: Record<string, string | string[] | undefined> | null
): InitialParams | null {
  if (!input) return null;
  const out: InitialParams = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
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

  let impactLabel: string | null = null;
  if (valueRaw) {
    const n = Number(valueRaw);
    if (Number.isFinite(n)) {
      // si on reçoit des cents, on convertit
      const dollars = n > 2000 ? n / 100 : n;
      impactLabel = `${Math.round(dollars)} $`;
    }
  }

  return {
    title: title?.trim() || null,
    type: type?.trim() || null,
    impactLabel,
    message: message?.trim() || null,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

function formatMoneyCad(value: number) {
  try {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
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

  // ✅ V1.4: hydrate depuis localStorage dès le rendu client
  const [result, setResult] = useState<AutoPilotResult | null>(() => readStoredResult());

  useEffect(() => {
    const normalized = normalizeInitialParams(initialSearchParams);
    setIsPremium(getIsPremium(normalized));
    setCtx(buildSafeCtxFromParams(normalized));
    setFocusMeta(buildFocusMeta(normalized));

    // Optionnel: si le state init n'a rien (SSR/client edge cases),
    // on tente une seconde lecture.
    if (!result) {
      const stored = readStoredResult();
      if (stored) setResult(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    if (!result) return null;

    const totalValue = result.totalValueCents ? result.totalValueCents / 100 : 0;
    const timeSaved = result.timeSavedMin || 0;
    

    return {
      totalValue,
      timeSaved,
    };
  }, [result]);

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-sm text-white/70">Chargement de l’assistant…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CONTEXTE (depuis Audit) */}
      {(focusMeta.title || focusMeta.type || focusMeta.impactLabel) && (
        <div className="rounded-2xl border border-[#c33541]/35 bg-slate-950/35 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/60">
                Contexte importé depuis Audit
              </p>
              <h2 className="mt-1 truncate text-lg font-extrabold text-white">
                {focusMeta.title || focusMeta.type || "Action prioritaire"}
              </h2>
              {(focusMeta.type || focusMeta.impactLabel) && (
                <p className="mt-1 text-sm text-white/70">
                  {focusMeta.type ? (
                    <span className="mr-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/75">
                      {focusMeta.type}
                    </span>
                  ) : null}
                  {focusMeta.impactLabel ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/75">
                      Impact ≈ {focusMeta.impactLabel}
                    </span>
                  ) : null}
                </p>
              )}
            </div>

            <a
              href="/audit"
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              ← Retour Audit
            </a>
          </div>

          {focusMeta.message && (
            <div className="mt-3 flex flex-col gap-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(focusMeta.message || "");
                  } catch {}
                }}
                className="inline-flex w-fit items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                📋 Copier le message importé
              </button>
              <p className="text-[11px] text-white/55">
                Astuce : colle-le dans SMS/Email, puis lance l’exécution guidée ci-dessous.
              </p>
            </div>
          )}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-6">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(900px_500px_at_20%_10%,rgba(195,53,65,0.35),transparent_60%),radial-gradient(900px_500px_at_80%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">
                ⚡ Auto-Pilot
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-white">
                Exécution guidée, sans friction.
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Lance l’assistant. Il enchaîne les étapes de récupération, et te confirme
                chaque action.
              </p>
		{/* Mini-étape – Guidance contextuelle V1.6 */}
<div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
  <div className="text-xs font-semibold text-white/80">
    Étape suivante (optionnelle)
  </div>

  <div className="mt-1 text-sm text-white/70">
    Tu peux lancer l’exécution guidée ci-dessous, ou copier le message et agir
    manuellement si tu préfères garder le contrôle.
  </div>
</div>

            </div>
          </div>

          <div className="mt-5">
            <AutoPilotButton
              ctx={ctx}
              onDone={(r) => {
                setResult(r);
                writeStoredResult(r); // ✅ V1.4: persiste
              }}
            />
          </div>

          {/* ✅ V1.4: control pour effacer */}
          {result && (
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
          )}

          {/* ===== RESULT ZONE (animated) ===== */}
          {result && (
            <div className="mt-6 animate-[fadeInUp_.25s_ease-out] space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Valeur récupérable"
                  value={formatMoneyCad(summary?.totalValue || 0)}
                />
                <Stat label="Temps économisé" value={`${summary?.timeSaved || 0} min`} />
		<Stat label="Valeur" value={`${summary?.totalValue || 0} $`} />

              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Résumé</p>
                <p className="mt-1 text-sm text-white/70">
                  {`Exécution terminée. Temps économisé: ${summary?.timeSaved ?? 0} min.`}
                </p>

                {!isPremium && (
                  <div className="mt-3 rounded-xl border border-[#c33541]/25 bg-[#c33541]/10 p-3">
                    <p className="text-sm font-semibold text-white">
                      🔒 Certaines actions sont limitées (Free)
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                      Débloque Premium pour une prise en charge complète.
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-[11px] text-white/60">
                    Contexte :{" "}
                    <span className="text-white/80">
                      {ctx.findingId || ctx.opportunityId}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* keyframes */}
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
