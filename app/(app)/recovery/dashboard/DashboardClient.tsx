"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DashboardMetrics, RangeKey } from "./types";

/* =======================
   Helpers
======================= */
const money = (n = 0) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/* =======================
   Card
======================= */
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
  const toneCls =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "bad"
      ? "border-rose-500/25 bg-rose-500/5"
      : tone === "accent"
      ? "border-red-500/35 bg-red-500/5"
      : "border-white/10 bg-white/5";

  const body = (
    <div className={`rounded-2xl border ${toneCls} p-4`}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs text-slate-300/70">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-300/60">{sub}</p>}
        </div>
        {icon && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-sm">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

/* =======================
   Component
======================= */
export default function DashboardClient({
  initialMetrics,
}: {
  initialMetrics: DashboardMetrics;
}) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [loading, setLoading] = useState(false);

  const autopilotQueuedCount =
    (metrics as any)?.autopilotQueued ??
    (metrics as any)?.kpis?.autopilotQueued ??
    0;

  const score = metrics.kpis?.recoveryScore ?? 0;

  /* =======================
     DESKTOP HEADER (RESTORED)
  ======================= */
  const DesktopHeader = (
    <div className="hidden sm:block">
      <div className="mx-auto max-w-[1500px] px-6 lg:px-8 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recovery</h1>
            <p className="mt-1 text-sm text-slate-300/70">
              Dernière analyse : {metrics.lastRunLabel || "—"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={
                metrics.globalAction?.href ||
                "/audit?focus=global&autoSelect=critical"
              }
              className="rounded-xl border border-red-500/35 bg-red-500/12 px-4 py-2 text-sm font-semibold hover:bg-red-500/18"
            >
              Continuer l’action prioritaire
            </Link>

            <Link
              href="/audit"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Ouvrir Audit
            </Link>

            <Link
              href="/autopilot"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Auto-Pilot
              {autopilotQueuedCount > 0 && (
                <span className="ml-2 rounded-full bg-slate-950 px-2 py-[1px] text-xs">
                  {autopilotQueuedCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  /* =======================
     MOBILE HEADER
  ======================= */
  const MobileHeader = (
    <div className="sm:hidden sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="px-4 py-3 flex justify-between">
        <div>
          <p className="text-xs font-semibold">Recovery</p>
          <p className="text-[11px] text-slate-300/70 line-clamp-1">
            Dernière analyse : {metrics.lastRunLabel || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/autopilot"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
          >
            Auto
          </Link>
          <Link
            href="/audit"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
          >
            Audit
          </Link>
        </div>
      </div>
    </div>
  );

  /* =======================
     RENDER
  ======================= */
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {DesktopHeader}
      {MobileHeader}

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card
            title="Valeur récupérable"
            value={money(metrics.kpis?.recoverableTotal)}
            icon="💰"
            tone="accent"
          />
          <Card
            title="Récupéré"
            value={money(metrics.kpis?.recoveredTotal)}
            icon="✅"
            tone="good"
          />
          <Card
            title="Perdu"
            value={money(metrics.kpis?.lostTotal)}
            icon="📉"
            tone="bad"
          />
          <Card
            title="Recovery Score"
            value={`${score}/100`}
            icon="⚡"
          />
          <Card
  title="Backlog moyen"
  value={`${(
    (metrics.kpis as any)?.avgBacklogDays ??
    (metrics.kpis as any)?.avgBacklog ??
    (metrics.kpis as any)?.backlogAvgDays ??
    (metrics.kpis as any)?.avgBacklogDays7 ??
    0
  ).toFixed?.(1) ?? (
    (metrics.kpis as any)?.avgBacklogDays ??
    (metrics.kpis as any)?.avgBacklog ??
    (metrics.kpis as any)?.backlogAvgDays ??
    (metrics.kpis as any)?.avgBacklogDays7 ??
    0
  )} j`}
  icon="📦"
/>

        </section>
      </div>

      {/* =======================
         MOBILE BOTTOM NEXT STEP
      ======================= */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 px-4 pb-4">
        <div className="rounded-2xl border border-red-500/30 bg-slate-950/90 backdrop-blur">
          <div className="px-4 py-3">
            <p className="text-[11px] text-slate-300/70">Prochaine étape</p>
            <p className="text-sm font-semibold line-clamp-1">
              {metrics.globalAction?.title || "Continuer l’action prioritaire"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            <Link
              href={
                metrics.globalAction?.href ||
                "/audit?focus=global&autoSelect=critical"
              }
              className="col-span-2 rounded-xl border border-red-500/35 bg-red-500/12 py-3 text-center text-sm font-semibold"
            >
              Continuer
            </Link>
            <Link
              href="/autopilot"
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm"
            >
              Auto
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
