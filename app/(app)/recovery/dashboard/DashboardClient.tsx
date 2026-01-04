"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DashboardMetrics, RangeKey } from "./types";

function money(n: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n)}%`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Card({
  title,
  value,
  sub,
  icon,
  tone = "default",
  href,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: string;
  tone?: "default" | "good" | "bad" | "accent";
  href?: string;
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "bad"
      ? "border-rose-500/25 bg-rose-500/5"
      : tone === "accent"
      ? "border-red-500/35 bg-red-500/5"
      : "border-white/10 bg-white/5";

  const inner = (
    <div
      className={[
        `rounded-2xl border ${toneClasses} p-4 shadow-sm`,
        "transition-transform duration-200 hover:scale-[1.01]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-300/80">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            {value}
          </p>
          {sub ? <p className="mt-1 text-xs text-slate-300/70">{sub}</p> : null}
        </div>
        {icon ? (
          <div className="shrink-0 rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-slate-200/90">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="block hover:opacity-[0.98] active:opacity-95">
      {inner}
    </Link>
  );
}

function TinyBars({
  a,
  b,
  loading,
}: {
  a: Array<{ label: string; value: number }>;
  b: Array<{ label: string; value: number }>;
  loading?: boolean;
}) {
  const maxA = Math.max(1, ...a.map((x) => x.value));
  const maxB = Math.max(1, ...b.map((x) => x.value));
  const max = Math.max(maxA, maxB);

  return (
    <div className="mt-3">
      <div
        className={[
          "flex items-end gap-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/40 p-3 transition",
          loading ? "opacity-70" : "opacity-100",
        ].join(" ")}
      >
        {a.length === 0 ? (
          <div className="text-xs text-slate-300/60">
            Aucune donnée pour cette période.
          </div>
        ) : (
          a.map((p, i) => {
            const hA = clamp((p.value / max) * 48, 2, 48);
            const hB = clamp(((b[i]?.value ?? 0) / max) * 48, 2, 48);
            return (
              <div
                key={`${p.label}-${i}`}
                className="flex flex-col items-center gap-1"
              >
                <div className="flex items-end gap-[2px]">
                  <div
                    className="w-[6px] rounded-sm bg-white/35 transition-[height] duration-500"
                    style={{ height: hA }}
                    title={`${p.label} • récupéré: ${money(p.value)}`}
                  />
                  <div
                    className="w-[6px] rounded-sm bg-white/15 transition-[height] duration-500"
                    style={{ height: hB }}
                    title={`${p.label} • perdu: ${money(b[i]?.value ?? 0)}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300/70">
        <span>Récupéré</span>
        <span>Perdu</span>
      </div>
    </div>
  );
}

function normalizeRange(raw: any): RangeKey {
  return raw === "7d" || raw === "30d" || raw === "90d" ? raw : "30d";
}

export default function DashboardClient({
  initialMetrics,
}: {
  initialMetrics: DashboardMetrics;
}) {
  const initialRange = normalizeRange(initialMetrics?.momentum?.range);
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/recovery/dashboard?range=${range}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as DashboardMetrics;

        const safeData: DashboardMetrics = {
          ...data,
          momentum: { ...data.momentum, range },
          globalAction: {
            ...data.globalAction,
            href:
              data.globalAction?.href ||
              "/audit?focus=global&autoSelect=critical",
          },
          lossSources: Array.isArray(data.lossSources)
            ? data.lossSources.map((x) => ({
                ...x,
                href: x.href || `/audit?focus=${x.key}&autoSelect=top`,
              }))
            : [],
        };

        if (!cancelled) setMetrics(safeData);
      } catch {
        // V1: on garde les données affichées
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (range !== initialRange) load();

    return () => {
      cancelled = true;
    };
  }, [range, initialRange]);

  const actionIsCritical = !!metrics.globalAction?.isCritical;

  // ✅ Drilldown intelligent (langage commun Dashboard → Audit)
  const kpiRecoverableHref = "/audit?focus=revenue&autoSelect=top";
  const kpiRecoveredHref = "/audit?focus=history&autoSelect=latest&history=30d";
  const kpiLostHref = "/audit?focus=loss&autoSelect=critical";
  const kpiScoreHref = "/audit?focus=score";
  const kpiDelayHref = "/audit?focus=delay&autoSelect=top&history=30d";

  // ✅ Compteur Auto-Pilot (TS-safe, selon les clés dispo)
  const autopilotQueuedCount = useMemo(() => {
    const anyMetrics = metrics as any;
    const n =
      anyMetrics?.kpis?.autopilotQueued ??
      anyMetrics?.kpis?.autopilotQueuedCount ??
      anyMetrics?.kpis?.autopilotQueuedTotal ??
      anyMetrics?.autopilot?.queued ??
      anyMetrics?.autopilotQueued ??
      0;

    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  }, [metrics]);

  const lastRunLine = useMemo(() => {
    const base = `Dernière analyse : ${metrics.lastRunLabel || "—"}`;
    return loading ? `${base} • mise à jour...` : base;
  }, [metrics.lastRunLabel, loading]);

  const score = metrics.kpis?.recoveryScore ?? 0;
  const scoreSub =
    score === 0
      ? "Aucune action requise sur la période"
      : "Basé sur ton exécution (30 jours)";
  const scoreTone =
    score === 0
      ? "default"
      : score >= 70
      ? "good"
      : score >= 35
      ? "default"
      : "bad";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-slate-100">
                Recovery Dashboard
              </h1>
              <p className="text-xs text-slate-300/70">{lastRunLine}</p>
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ NOUVEAU : bouton Auto-Pilot (file d’exécution) */}
              <Link
                href="/autopilot"
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition",
                  autopilotQueuedCount > 0
                    ? "border-red-500/35 bg-red-500/10 text-slate-100 hover:bg-red-500/15"
                    : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
                ].join(" ")}
                title="Ouvrir la file d’exécution Auto-Pilot"
              >
                <span>📋 Auto-Pilot</span>
                {autopilotQueuedCount > 0 ? (
                  <span className="rounded-full border border-white/15 bg-slate-950/60 px-2 py-[2px] text-[11px] font-semibold text-slate-100">
                    {autopilotQueuedCount}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/audit"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
              >
                Audit
              </Link>

              <Link
                href="/"
                className="hidden sm:inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
              >
                Accueil
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <section className="grid gap-3 md:grid-cols-5">
          <Card
            title="Valeur récupérable"
            value={money(metrics.kpis?.recoverableTotal ?? 0)}
            icon="💰"
            tone="accent"
            href={kpiRecoverableHref}
          />
          <Card
            title="Déjà récupéré"
            value={money(metrics.kpis?.recoveredTotal ?? 0)}
            icon="🔁"
            tone="good"
            href={kpiRecoveredHref}
          />
          <Card
            title="Valeur perdue"
            value={money(metrics.kpis?.lostTotal ?? 0)}
            icon="📉"
            tone="bad"
            href={kpiLostHref}
          />
          <Card
            title="Recovery Score"
            value={`${score}/100`}
            icon="⚡"
            tone={scoreTone}
            sub={scoreSub}
            href={kpiScoreHref}
          />
          <Card
            title="Délai moyen"
            value={`${Number(metrics.kpis?.avgDaysToRecover ?? 0).toFixed(1)} j`}
            icon="⏱️"
            sub="Temps moyen pour récupérer"
            tone="default"
            href={kpiDelayHref}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Évolution Recovery
                </p>
                <p className="text-xs text-slate-300/70">
                  {metrics.momentum?.recoveryRatePct ?? 0}% de taux Recovery •{" "}
                  {pct(metrics.momentum?.deltaVsPrevPct ?? 0)} vs période
                  précédente
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(["7d", "30d", "90d"] as RangeKey[]).map((k) => {
                  const active = range === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setRange(k)}
                      disabled={loading && active}
                      className={[
                        "rounded-xl border px-3 py-2 text-xs font-medium transition",
                        active
                          ? "border-red-500/40 bg-red-500/10 text-slate-100"
                          : "border-white/10 bg-slate-950/40 text-slate-100 hover:bg-white/10",
                        loading && !active ? "opacity-80" : "",
                      ].join(" ")}
                    >
                      {k.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <TinyBars
              a={metrics.momentum?.recoveredSeries ?? []}
              b={metrics.momentum?.lostSeries ?? []}
              loading={loading}
            />
          </div>

          <div
            className={[
              "rounded-2xl border p-5 shadow-sm transition",
              actionIsCritical
                ? "border-red-500/45 bg-red-500/8 shadow-red-500/10"
                : "border-emerald-500/25 bg-emerald-500/5",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">
                  {actionIsCritical
                    ? "🧠 Action prioritaire globale"
                    : "✅ Tout est sous contrôle"}
                </p>
                <p className="mt-2 text-sm leading-snug text-slate-100">
                  {metrics.globalAction?.title ?? "—"}
                </p>
                <p className="mt-1 text-xs text-slate-300/70">
                  {metrics.globalAction?.subtitle ?? ""}
                </p>
              </div>

              {actionIsCritical ? (
                <div className="h-3 w-3 shrink-0 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.55)] animate-pulse" />
              ) : (
                <div className="h-3 w-3 shrink-0 rounded-full bg-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
              )}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-xs text-slate-300/70">Valeur potentielle</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {money(metrics.globalAction?.potentialValue ?? 0)}
              </p>
            </div>

            <Link
              href={
                metrics.globalAction?.href ||
                "/audit?focus=global&autoSelect=critical"
              }
              className={[
                "mt-4 inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition",
                actionIsCritical
                  ? "border-red-500/35 bg-red-500/12 hover:bg-red-500/18"
                  : "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15",
              ].join(" ")}
            >
              {actionIsCritical
                ? metrics.globalAction?.ctaLabel || "Agir maintenant"
                : "Voir les opportunités actives"}
            </Link>

            <p className="mt-3 text-[11px] text-slate-300/60">
              Drilldown intelligent: focus + autoSelect, sans casser nbaMode.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Principales sources de perte
            </p>
            <p className="text-xs text-slate-300/70">
              Top 5 — clique pour investiguer
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {(metrics.lossSources ?? []).length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300/70">
                Aucune source de perte détectée pour le moment.
              </div>
            ) : (
              (metrics.lossSources ?? []).map((s) => (
                <Link
                  key={s.key}
                  href={s.href || `/audit?focus=${s.key}&autoSelect=top`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/10"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100">{s.label}</p>
                    <p className="text-xs text-slate-300/70">
                      Ouvrir Audit avec focus “{s.key}”
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-100">
                    {money(s.value ?? 0)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-100">
              Feedback & Momentum
            </p>
            <p className="text-xs text-slate-300/70">
              Dopamine business (sans pression)
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:bg-white/5">
              <p className="text-xs text-slate-300/70">🔥 Streak Recovery</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">
                {metrics.motivation?.streakDays ?? 0} jours
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:bg-white/5">
              <p className="text-xs text-slate-300/70">🏆 Meilleure journée</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">
                {money(metrics.motivation?.bestDayValue ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:bg-white/5">
              <p className="text-xs text-slate-300/70">📣 Insight</p>
              <p className="mt-1 text-sm leading-snug text-slate-100">
                {metrics.motivation?.insight ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 pb-8 text-center text-xs text-slate-300/50">
          Prospek 360 • Recovery Engine — Dashboard V1
        </footer>
      </div>
    </main>
  );
}
