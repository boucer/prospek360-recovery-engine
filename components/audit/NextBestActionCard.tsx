"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/audit/types";

export default function NextBestActionCard({
  opportunity,
  onCopy,
  onMarkTreated,
  onRunAudit,
  onViewInList,
  isBusy,
  hideValue = false,

  // ✅ optionnels (compat si ton client les passe)
  prevHref,
  nextHref,
  urgentHref,
  noreplyHref,
  allHref,
  onGoHistory,
}: {
  opportunity: Opportunity | null;
  onCopy: (opp: Opportunity) => void;
  onMarkTreated: (opp: Opportunity) => void;
  onRunAudit: () => void;
  onViewInList?: () => void;
  isBusy?: boolean;
  hideValue?: boolean;

  prevHref?: string;
  nextHref?: string;
  urgentHref?: string;
  noreplyHref?: string;
  allHref?: string;
  onGoHistory?: () => void;
}) {
  const [justHandled, setJustHandled] = useState(false);

  // micro anim triggers (local)
  const [wow, setWow] = useState<"idle" | "fire">("idle");
  const [sparkSeed, setSparkSeed] = useState(0);

  useEffect(() => {
    // reset quand l’opportunité change
    setJustHandled(false);
    setWow("idle");
  }, [opportunity?.id]);

  const value = useMemo(() => {
    if (!opportunity) return 0;
    return Math.round(((opportunity as any).valueCents ?? 0) / 100);
  }, [opportunity]);

  if (!opportunity) {
    return (
      <div
        id="nba-card"
        className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400"
      >
        Aucune action prioritaire pour le moment.
      </div>
    );
  }

  const priorityLabel = (opportunity as any).priorityLabel ?? "—";
  const typeCode = (opportunity as any).typeCode ?? "—";
  const typeLabel = (opportunity as any).typeLabel ?? (opportunity as any).type ?? "Opportunité";
  const detail = (opportunity as any).detail ?? "";

  const hasNav =
    Boolean(prevHref) ||
    Boolean(nextHref) ||
    Boolean(urgentHref) ||
    Boolean(noreplyHref) ||
    Boolean(allHref);

  const navLink = (href?: string) =>
    href && href !== "#" ? href : undefined;

  return (
    <section
      id="nba-card"
      className={[
        "relative overflow-hidden rounded-3xl p-6 transition-all duration-300",
        "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white",

        // 🔴 contour Prospek360 fidèle
        "border-[5px] border-[#c33541]",
        "ring-1 ring-[#ff6b7a]/35",
        "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]",

        // subtle “breathing”
        "nba-reward-pulse",

        // WOW pop
        wow === "fire" ? "nba-wow-pop" : "",
      ].join(" ")}
    >
      {/* Glow branding */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,107,122,0.14),transparent_60%)]" />
      {/* Texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* Sheen sweep (WOW) */}
      {wow === "fire" && (
        <div className="pointer-events-none absolute inset-0 nba-sheen" />
      )}

      {/* Spark burst (WOW) */}
      <SparkBurst show={wow === "fire"} seed={sparkSeed} />

      <div className="relative">
        {/* Badge */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c33541]/30 bg-[#c33541]/10 px-3 py-1 text-xs font-semibold text-red-300">
          🔥 Action recommandée maintenant
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold tracking-tight">{typeLabel}</h3>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            Priorité : {priorityLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
            Type : {typeCode}
          </span>
        </div>

        {/* Desc */}
        <p className="mt-4 text-sm leading-relaxed text-slate-100/90">{detail}</p>

        {/* Value */}
        {!hideValue && (
          <div className="mt-4 text-sm">
            <span className="text-slate-300">Impact estimé :</span>{" "}
            <span className="font-semibold text-white">{value} $</span>
          </div>
        )}

        {/* Optional mini-nav (si ton client le passe) */}
        {hasNav && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-200/80">
            {navLink(prevHref) ? (
              <a
                href={prevHref}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              >
                ← Précédent
              </a>
            ) : null}

            {navLink(nextHref) ? (
              <a
                href={nextHref}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              >
                Suivant →
              </a>
            ) : null}

            {navLink(urgentHref) ? (
              <a
                href={urgentHref}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              >
                Urgent
              </a>
            ) : null}

            {navLink(noreplyHref) ? (
              <a
                href={noreplyHref}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              >
                No reply
              </a>
            ) : null}

            {navLink(allHref) ? (
              <a
                href={allHref}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              >
                Tous
              </a>
            ) : null}

            {onGoHistory ? (
              <button
                onClick={onGoHistory}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
                type="button"
              >
                Historique
              </button>
            ) : null}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onCopy(opportunity)}
            disabled={isBusy}
            className="rounded-lg px-4 py-2 text-sm font-medium transition border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
            type="button"
          >
            Copier le message
          </button>

          <button
            onClick={() => {
              if (isBusy) return;
              setJustHandled(true);

              // 🔥 WOW micro-anim
              setSparkSeed((s) => s + 1);
              setWow("fire");
              window.setTimeout(() => setWow("idle"), 520);

              onMarkTreated(opportunity);
            }}
            disabled={isBusy}
            className={[
              "relative overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold transition",
              "disabled:opacity-60",

              // ✅ plus de vert vomi : traité = dark premium + contour rouge soft
              justHandled
                ? "border border-[rgba(195,53,65,0.55)] bg-slate-950 text-slate-100 shadow-[0_0_0_3px_rgba(195,53,65,0.10)]"
                : "bg-red-600 text-white hover:bg-red-500",
            ].join(" ")}
            type="button"
          >
            {/* mini shine sur le bouton quand traité */}
            {justHandled ? <span className="nba-btn-sheen" /> : null}

            <span className="relative z-[1]">
              {justHandled ? "Traité ✓" : "Marquer comme traité"}
            </span>
          </button>

          {onViewInList ? (
            <button
              onClick={onViewInList}
              disabled={isBusy}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition border border-white/15 bg-white/5 text-white hover:bg-white/10 disabled:opacity-60"
              type="button"
            >
              Voir dans la liste ↓
            </button>
          ) : null}
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-slate-300">
          ⏱️ ~2 minutes · action la plus rentable aujourd’hui
        </div>
      </div>

      {/* CSS (safe, pas besoin de tailwind config) */}
      <style jsx>{`
        .nba-reward-pulse {
          animation: nbaRewardPulse 3.6s ease-in-out infinite;
        }
        @keyframes nbaRewardPulse {
          0%,
          100% {
            filter: saturate(1);
            transform: translateZ(0);
          }
          50% {
            filter: saturate(1.02);
          }
        }

        .nba-wow-pop {
          animation: nbaWowPop 520ms cubic-bezier(0.2, 1, 0.2, 1) both;
        }
        @keyframes nbaWowPop {
          0% {
            transform: scale(1);
          }
          32% {
            transform: scale(1.012);
          }
          100% {
            transform: scale(1);
          }
        }

        .nba-sheen {
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.06) 35%,
            rgba(195, 53, 65, 0.08) 50%,
            rgba(255, 255, 255, 0.05) 65%,
            transparent 100%
          );
          transform: translateX(-60%);
          animation: nbaSheen 520ms ease-out both;
          mix-blend-mode: screen;
        }
        @keyframes nbaSheen {
          to {
            transform: translateX(60%);
          }
        }

        .nba-btn-sheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 45%,
            rgba(195, 53, 65, 0.12) 55%,
            transparent 100%
          );
          transform: translateX(-65%);
          animation: nbaBtnSheen 600ms ease-out both;
          pointer-events: none;
        }
        @keyframes nbaBtnSheen {
          to {
            transform: translateX(65%);
          }
        }
      `}</style>
    </section>
  );
}

/** Spark burst premium (subtil) */
function SparkBurst({ show, seed = 0 }: { show: boolean; seed?: number }) {
  if (!show) return null;

  const sparks = [
    { dx: -46, dy: -18, s: 1.0, r: -12 },
    { dx: -28, dy: -44, s: 0.9, r: 8 },
    { dx: -6, dy: -56, s: 1.05, r: -6 },
    { dx: 22, dy: -48, s: 0.95, r: 10 },
    { dx: 44, dy: -22, s: 1.0, r: 14 },
    { dx: 40, dy: 6, s: 0.9, r: -8 },
    { dx: 16, dy: 18, s: 0.85, r: 6 },
    { dx: -26, dy: 10, s: 0.9, r: -10 },
  ];

  return (
    <div className="pointer-events-none absolute left-10 top-10 z-[5]">
      {sparks.map((p, i) => (
        <span
          key={`${seed}-${i}`}
          className="absolute block h-1.5 w-1.5 rounded-full opacity-0"
          style={{
            background:
              i % 3 === 0
                ? "rgba(34,197,94,0.55)" // vert soft (très discret)
                : i % 3 === 1
                ? "rgba(148,163,184,0.9)" // slate
                : "rgba(195,53,65,0.85)", // prospek red
            transform: `translate(0px, 0px) scale(${p.s}) rotate(${p.r}deg)`,
            animation: `sparkBurst 420ms ease-out forwards`,
            ["--dx" as any]: `${p.dx}px`,
            ["--dy" as any]: `${p.dy}px`,
            animationDelay: `${i * 12}ms`,
            boxShadow: "0 0 14px rgba(195,53,65,0.10)",
          }}
        />
      ))}

      <style jsx>{`
        @keyframes sparkBurst {
          0% {
            opacity: 0;
            transform: translate(0px, 0px) scale(0.8);
            filter: blur(0px);
          }
          15% {
            opacity: 0.85;
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) scale(1.1);
            filter: blur(0.2px);
          }
        }
      `}</style>
    </div>
  );
}
