"use client";

import { useEffect, useMemo, useState } from "react";
import type { AutoPilotContext } from "@/lib/autopilot/types";
import AutoPilotButton, { type AutoPilotResult } from "./AutoPilotButton";

/* =========================
   Utils
========================= */

const AUTOPILOT_STORAGE_KEY = "prospek360.autopilot.lastResult";

function getIsPremiumFromUrl() {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  return sp.get("premium") === "1";
}

function buildSafeCtxFromUrl(): AutoPilotContext {
  const sp =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const opportunityId = sp?.get("opportunityId") || "autopilot-global";
  const findingId = sp?.get("findingId") || undefined;

  return {
    opportunityId,
    findingId,
    contact: { email: "", phone: "" },
  } as AutoPilotContext;
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
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTOPILOT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AutoPilotResult) : null;
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

export default function AutopilotClient() {
  const [isPremium, setIsPremium] = useState(false);
  const [ctx, setCtx] = useState<AutoPilotContext | null>(null);

  // ✅ V1.4: hydrate depuis localStorage dès le rendu client
  const [result, setResult] = useState<AutoPilotResult | null>(() => readStoredResult());

  useEffect(() => {
    setIsPremium(getIsPremiumFromUrl());
    setCtx(buildSafeCtxFromUrl());

    // Optionnel: si le state init n'a rien (SSR/client edge cases),
    // on tente une seconde lecture.
    if (!result) {
      const stored = readStoredResult();
      if (stored) setResult(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBlocked = !!result?.blockReason;

  const assistantStatus = useMemo(() => {
    if (!result) return { label: "Assistant prêt", tone: "idle" as const };
    if (isBlocked) return { label: "Action requise", tone: "warning" as const };
    return { label: "Travail terminé", tone: "success" as const };
  }, [result, isBlocked]);

  const valueEstimate = useMemo(() => {
    if (!result || isBlocked) return null;
    const recoveredValue = result.recoveredOpportunities * 250;
    return {
      recoveredValueLabel: formatMoneyCad(recoveredValue),
      confidence: isPremium ? "Haute" : "Moyenne",
    };
  }, [result, isBlocked, isPremium]);

  if (!ctx) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-white/80">Préparation de l’assistant…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/35 bg-gradient-to-b from-slate-950 to-slate-950/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                Auto-Pilot
              </span>

              {/* Assistant status */}
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold border",
                  assistantStatus.tone === "success" &&
                    "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
                  assistantStatus.tone === "warning" &&
                    "border-amber-300/30 bg-amber-300/10 text-amber-100",
                  assistantStatus.tone === "idle" &&
                    "border-white/10 bg-white/5 text-white/70",
                ].join(" ")}
              >
                {assistantStatus.label}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
              Ton assistant s’occupe des actions Recovery importantes.
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-white/70">
              {isPremium
                ? "Mode Premium : l’assistant agit, vérifie et te résume la valeur."
                : "Mode gratuit : aperçu guidé. Débloque Premium pour une prise en charge complète."}
            </p>

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
              <div
                className={[
                  "mt-4 transition-all duration-500 ease-out",
                  "animate-[fadeInUp_0.5s_ease-out]",
                ].join(" ")}
              >
                {/* BLOCKED */}
                {isBlocked && (
                  <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5">
                    <p className="text-sm font-semibold text-amber-100">
                      L’assistant a besoin de toi
                    </p>
                    <p className="mt-1 text-xs text-amber-100/75">
                      Une information manque avant de poursuivre automatiquement.
                    </p>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                      <ul className="space-y-1 text-xs text-white/70">
                        {result.logs.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* SUCCESS */}
                {!isBlocked && (
                  <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-emerald-100">
                        L’assistant a fait le travail
                      </p>

                      {valueEstimate && (
                        <span className="rounded-xl border border-emerald-400/30 bg-black/20 px-3 py-1 text-xs text-emerald-100">
                          Valeur estimée :{" "}
                          <strong>{valueEstimate.recoveredValueLabel}</strong>{" "}
                          <span className="opacity-70">
                            (confiance {valueEstimate.confidence})
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Stat label="Actions traitées" value={`${result.executedSteps}`} />
                      <Stat label="Temps économisé" value={`~${result.timeSavedMin} min`} />
                      <Stat
                        label="Opportunités récupérées"
                        value={`${result.recoveredOpportunities}`}
                      />
                    </div>

                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-semibold text-white/80">
                        Journal de l’assistant
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-white/70">
                        {result.logs.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isPremium && (
              <div className="mt-4 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-sm font-semibold text-amber-100">Mode gratuit</p>
                <p className="mt-1 text-xs text-amber-100/75">
                  L’assistant te montre ce qu’il ferait. En Premium, il agit pour toi.
                </p>
                <div className="mt-3">
                  <a
                    href="/premium"
                    className="inline-flex items-center rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-200"
                  >
                    Débloquer Premium
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* SIDE CARD */}
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold text-white/75">
              Comment l’assistant travaille
            </p>
            <ul className="mt-2 space-y-2 text-xs text-white/65">
              <li>• Analyse la situation actuelle</li>
              <li>• Décide quoi faire en priorité</li>
              <li>• Agit sans risque</li>
              <li>• Te résume l’impact</li>
            </ul>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] text-white/60">
                Contexte :{" "}
                <span className="text-white/80">
                  {ctx.findingId || ctx.opportunityId}
                </span>
              </p>
            </div>
          </div>
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
