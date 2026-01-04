"use client";

import Link from "next/link";

type Props = {
  kpis: any;
  trend: any[];
  breakdown: any;
  insight?: any;
};

function moneyFromCents(cents: any) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.round(n / 100));
}

function num(n: any, fallback = 0) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function Card({
  title,
  value,
  sub,
  href,
  tone = "default",
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  href?: string;
  icon?: string;
  tone?: "default" | "good" | "bad" | "accent";
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
    <div className={`rounded-2xl border ${toneClasses} p-4`}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-xs text-slate-300/80">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-300/70">{sub}</p>}
        </div>
        {icon && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-sm">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function RecoveryDashboardClient({
  kpis,
  trend,
  breakdown,
  insight,
}: Props) {
  const queued = num(kpis?.queuedCount);
  const handledToday = num(kpis?.handledToday);
  const avgHours7d = num(kpis?.avgHoursToHandle7d);
  const avgBacklogDays = num(kpis?.avgBacklogDays);
  const streak30d = num(kpis?.streak30d);

  const score = num(kpis?.recoveryScore || kpis?.score || 0);

  return (
    <div className="w-full">
      {/* INSIGHT */}
      {insight && (
        <div className="mb-4 rounded-2xl border border-red-500/35 bg-red-500/5 p-5">
          <p className="text-sm font-semibold text-slate-100">{insight.title}</p>
          <p className="mt-2 text-sm text-slate-200/90">
            {insight.message || insight.text}
          </p>
        </div>
      )}

      {/* KPIs — MOBILE = 2 COLONNES */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card
          title="Valeur récupérable"
          value={moneyFromCents(kpis?.recoverableCentsTodo)}
          icon="💰"
          tone="accent"
        />
        <Card
          title="Récupéré (7 jours)"
          value={moneyFromCents(kpis?.recoveredCentsLast7d)}
          icon="📆"
          tone="good"
        />
        <Card
          title="Récupéré (30 jours)"
          value={moneyFromCents(kpis?.recoveredCentsLast30d)}
          icon="📈"
          tone="good"
        />
        <Card
          title="Recovery Score"
          value={`${Math.round(score)}/100`}
          icon="⚡"
        />
        <Card
          title="Backlog moyen"
          value={`${avgBacklogDays.toFixed(1)} j`}
          icon="📦"
        />
      </section>

      {/* SECOND ROW */}
      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="En attente" value={`${queued}`} icon="🧾" />
        <Card title="Traités aujourd’hui" value={`${handledToday}`} icon="🟢" />
        <Card
          title="Temps moyen (7j)"
          value={`${avgHours7d.toFixed(1)} h`}
          icon="⏱️"
        />
        <Card title="Streak 30 jours" value={`${streak30d}`} icon="🔥" />
      </section>
    </div>
  );
}
