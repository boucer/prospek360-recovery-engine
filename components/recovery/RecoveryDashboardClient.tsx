"use client";

import { useState } from "react";
import { KpiCard } from "./KpiCard";
import type { RecoveryBreakdown, RecoveryKpis, RecoveryTrendPoint } from "@/lib/recoveryMetrics";

function dollars(cents: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
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

      const data = (await res.json()) as AutopilotResult;
      setAutoMsg(data.message ?? "Auto-Pilot terminé.");

      // V1: refresh simple & stable pour recharger les KPI
      window.location.reload();
    } catch (e) {
      console.error(e);
      setAutoMsg("Erreur Auto-Pilot. Regarde la console/terminal.");
    } finally {
      setAutoLoading(false);
    }
  }

  const insights: Array<{ title: string; body: string }> = [];

  const topType = breakdown.byType?.[0];
  const topSeverity = breakdown.bySeverity?.[0];

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

  return (
    <div className="space-y-6">
      {/* Auto-Pilot */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Auto-Pilot Recovery</div>
          <div className="text-sm text-white/60">
            1 clic → sélectionne le levier #1 et met en file les meilleures opportunités (sans marquer “traité”).
          </div>
        </div>

        <button
          onClick={runAutopilot}
          disabled={autoLoading || kpis.todoCount === 0}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          {autoLoading ? "Auto-Pilot..." : "▶ Lancer Auto-Pilot"}
        </button>
      </div>

      {autoMsg ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-white/70">
          {autoMsg}
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard label="À traiter" value={String(kpis.todoCount)} />
        <KpiCard label="En Auto-Pilot" value={String(kpis.queuedCount)} />
        <KpiCard label="Traité aujourd’hui" value={String(kpis.handledToday)} />
        <KpiCard label="$ récupéré (7j)" value={dollars(kpis.recoveredCentsLast7d)} />
        <KpiCard label="$ récupéré (30j)" value={dollars(kpis.recoveredCentsLast30d)} />
        <KpiCard
          label="Temps moyen (7j)"
          value={kpis.avgHoursToHandle7d ? `${kpis.avgHoursToHandle7d}h` : "—"}
          hint="créé → traité"
        />
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
          <div className="text-sm font-semibold text-white">Insights</div>
          {insights.map((i) => (
            <InsightCard key={i.title} title={i.title} body={i.body} />
          ))}
        </div>
      </div>
    </div>
  );
}
