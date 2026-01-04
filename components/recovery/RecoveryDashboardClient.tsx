"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KpiCard } from "./KpiCard";
import type { RecoveryBreakdown, RecoveryKpis, RecoveryTrendPoint } from "@/lib/recoveryMetrics";

function dollars(cents: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function InsightCard({
  title,
  body,
  emphasis,
}: {
  title: string;
  body: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-slate-950/40 p-4",
        emphasis ? "border-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]" : "border-white/10",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-white/70">{body}</div>
    </div>
  );
}

type AutopilotResult = {
  ok: boolean;
  targetType?: string;
  queued?: number;
  queuedValueCents?: number;
  message?: string;
};

export default function RecoveryDashboardClient({
  kpis,
  trend,
  breakdown,
}: {
  kpis: RecoveryKpis;
  trend: RecoveryTrendPoint[];
  breakdown: RecoveryBreakdown;
}) {
  const router = useRouter();

  const [autoLoading, setAutoLoading] = useState(false);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  async function runAutopilot() {
    try {
      setAutoLoading(true);
      setAutoMsg(null);

      const res = await fetch("/api/recovery/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10, strategy: "TOP_TYPE" }),
      });

      // Si le serveur répond avec une erreur, on affiche un message et on ne navigue pas
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP_${res.status}`);
      }

      const data = (await res.json()) as AutopilotResult;

      if (!data?.ok) {
        setAutoMsg(data?.message ?? "Auto-Pilot: erreur inconnue.");
        return;
      }

      // Message optionnel (utile si tu veux logger/debug)
      setAutoMsg(data.message ?? "Auto-Pilot prêt. Redirection…");

      // ✅ V1: après génération -> aller exécuter / guider dans Auto-Pilot
      router.push("/autopilot");
    } catch (e) {
      console.error(e);
      setAutoMsg("Erreur Auto-Pilot. Regarde la console/terminal.");
    } finally {
      setAutoLoading(false);
    }
  }

  const topType = breakdown.byType?.[0];
  const topSeverity = breakdown.bySeverity?.[0];

  // -------------------------
  // HERO (décision unique)
  // -------------------------
  const hasTodo = kpis.todoCount > 0;

  const heroTitle = hasTodo ? "Prochaine action (Recovery)" : "Inbox Recovery clean ✅";
  const heroSubtitle = hasTodo
    ? topType
      ? `Levier #1: ${topType.key} (${topType.count})`
      : `Tu as ${kpis.todoCount} opportunités à traiter`
    : "Aucune opportunité en attente. Tu peux relancer une nouvelle vague d’audit.";

  const heroNote = hasTodo
    ? kpis.recoverableCentsTodo > 0
      ? `Potentiel à récupérer: ${dollars(kpis.recoverableCentsTodo)}`
      : "Potentiel à récupérer: —"
    : "Tu peux quand même consulter tous les audits et l’historique.";

  const heroPrimaryLabel = hasTodo ? "▶ Lancer Auto-Pilot (recommandé)" : "Aller à Audit";
  const heroSecondaryLabel = hasTodo ? "Traiter manuellement" : "Voir le dashboard";

  // -------------------------
  // INSIGHTS (1 directionnel + reste)
  // -------------------------
  const insights: Array<{ title: string; body: string }> = [];

  if (kpis.todoCount >= 15) {
    insights.push({
      title: "Backlog élevé",
      body: `Tu as ${kpis.todoCount} items à traiter. Objectif: en fermer 5 aujourd’hui pour relancer la machine.`,
    });
  } else if (kpis.todoCount > 0) {
    insights.push({
      title: "Momentum facile",
      body: `Il reste ${kpis.todoCount} items à traiter. Un mini-sprint de 15 minutes peut te donner un “WOW” immédiat.`,
    });
  } else {
    insights.push({
      title: "Inbox clean ✅",
      body: `Aucun item en attente. Tu peux maintenant focus sur la prochaine vague d’audit.`,
    });
  }

  if (kpis.handledToday === 0 && kpis.streak30d > 0) {
    insights.push({
      title: "Streak en danger",
      body: `Streak actuel: ${kpis.streak30d} jours. Traite 1 item maintenant pour garder l’élan.`,
    });
  }

  if (topType) {
    insights.push({
      title: "Levier #1",
      body: `Le type qui bloque le plus en ce moment: ${topType.key} (${topType.count}). Priorise-le dans ta prochaine session.`,
    });
  }

  if (topSeverity) {
    insights.push({
      title: "Sévérité dominante",
      body: `La sévérité la plus fréquente dans tes TODO: ${topSeverity.key}. Ça te dit où concentrer ton énergie.`,
    });
  }

  if (typeof kpis.avgHoursToHandle7d === "number") {
    const h = kpis.avgHoursToHandle7d;
    if (h > 24) {
      insights.push({
        title: "Temps de réaction à réduire",
        body: `Moyenne ~${h}h avant traitement (7 jours). Cible < 12h pour accélérer la récupération.`,
      });
    } else if (h > 0) {
      insights.push({
        title: "Rythme solide",
        body: `Moyenne ~${h}h avant traitement (7 jours). Continue: tu compresses le délai et récupères plus vite.`,
      });
    }
  }

  const primaryInsight = insights[0];
  const secondaryInsights = insights.slice(1);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="rounded-2xl border border-rose-500/40 bg-slate-950/60 p-5 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/50">Prospek360 — Recovery Engine</div>
            <div className="mt-1 text-2xl font-semibold text-white">{heroTitle}</div>
            <div className="mt-2 text-sm text-white/70">{heroSubtitle}</div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/55">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{heroNote}</span>

              {kpis.avgBacklogAgeDaysTodo != null && hasTodo ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                  Âge moyen du backlog: {kpis.avgBacklogAgeDaysTodo}j
                </span>
              ) : null}

              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                <Link className="hover:text-white" href="/audit">
                  Voir tous les audits →
                </Link>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {hasTodo ? (
              <button
                type="button"
                onClick={runAutopilot}
                disabled={autoLoading || kpis.todoCount === 0}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-50 sm:w-auto"
              >
                {autoLoading ? "Auto-Pilot..." : heroPrimaryLabel}
              </button>
            ) : (
              <Link
                href="/audit"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-center text-sm font-semibold hover:bg-white/15 sm:w-auto"
              >
                {heroPrimaryLabel}
              </Link>
            )}

            {hasTodo ? (
              <Link
                href="/audit"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-semibold hover:bg-white/10 sm:w-auto"
              >
                {heroSecondaryLabel}
              </Link>
            ) : (
              <span className="text-xs text-white/45">Tout est clean — continue comme ça 👌</span>
            )}
          </div>
        </div>
      </div>

      {/* Auto-Pilot (secondaire) */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Auto-Pilot Recovery</div>
          <div className="text-sm text-white/60">
            1 clic → sélectionne le levier #1 et met en file les meilleures opportunités (sans marquer “traité”).
          </div>
        </div>

        <button
          type="button"
          onClick={runAutopilot}
          disabled={autoLoading || kpis.todoCount === 0}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          {autoLoading ? "Auto-Pilot..." : "▶ Lancer Auto-Pilot"}
        </button>
      </div>

      {autoMsg ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-white/70">{autoMsg}</div>
      ) : null}

      {/* KPIs — PRIORITÉ (4) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="À récupérer (TODO)" value={dollars(kpis.recoverableCentsTodo)} hint="potentiel" />
        <KpiCard label="Opportunités à traiter" value={String(kpis.todoCount)} />
        <KpiCard
          label="Âge backlog (moy.)"
          value={kpis.avgBacklogAgeDaysTodo != null ? `${kpis.avgBacklogAgeDaysTodo}j` : "—"}
          hint="TODO → maintenant"
        />
        <KpiCard label="$ récupéré (7j)" value={dollars(kpis.recoveredCentsLast7d)} />
      </div>

      {/* KPIs — SECONDAIRE */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard label="En Auto-Pilot" value={String(kpis.queuedCount)} />
        <KpiCard label="Traité aujourd’hui" value={String(kpis.handledToday)} />
        <KpiCard label="Traité (7j)" value={String(kpis.handledLast7d)} />
        <KpiCard label="$ récupéré (30j)" value={dollars(kpis.recoveredCentsLast30d)} />
        <KpiCard
          label="Temps moyen (7j)"
          value={kpis.avgHoursToHandle7d ? `${kpis.avgHoursToHandle7d}h` : "—"}
          hint="créé → traité"
        />
        <KpiCard label="Streak (30j)" value={String(kpis.streak30d)} hint="jours consécutifs" />
      </div>

      {/* Trend */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Tendance (7 jours)</div>
          <div className="text-xs text-white/50">Traités + $ récupéré</div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {trend.map((p) => (
            <div key={p.day} className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-center">
              <div className="text-[10px] text-white/50">{p.day.slice(5)}</div>
              <div className="mt-1 text-lg font-semibold text-white">{p.handled}</div>
              <div className="text-[10px] text-white/50">{dollars(p.recoveredCents)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown + Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="text-sm font-semibold text-white">Blocages par type (TODO)</div>
          <div className="mt-3 space-y-2">
            {breakdown.byType.length ? (
              breakdown.byType.map((x) => (
                <div
                  key={x.key}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                >
                  <div className="text-sm text-white/80">{x.key}</div>
                  <div className="text-sm font-semibold text-white">{x.count}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">Aucun TODO 🎉</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="text-sm font-semibold text-white">Blocages par sévérité (TODO)</div>
          <div className="mt-3 space-y-2">
            {breakdown.bySeverity.length ? (
              breakdown.bySeverity.map((x) => (
                <div
                  key={x.key}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                >
                  <div className="text-sm text-white/80">Severity {x.key}</div>
                  <div className="text-sm font-semibold text-white">{x.count}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/60">Aucun TODO 🎉</div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Insight directionnel</div>
          {primaryInsight ? <InsightCard title={primaryInsight.title} body={primaryInsight.body} emphasis /> : null}

          {secondaryInsights.length ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/40">Autres signaux</div>
              {secondaryInsights.slice(0, 3).map((i) => (
                <InsightCard key={i.title} title={i.title} body={i.body} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
