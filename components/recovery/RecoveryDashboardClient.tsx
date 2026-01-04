"use client";

import Link from "next/link";

type Props = {
  kpis: any;
  trend: any[];
  breakdown: any;
  insight?: any; // ✅ accepte insight (optionnel)
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
    <div className={`rounded-2xl border ${toneClasses} p-4 shadow-sm`}>
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

export default function RecoveryDashboardClient({
  kpis,
  trend,
  breakdown,
  insight,
}: Props) {
  // ✅ KPIs (compatibles avec différents shapes)
  const recoverable =
    kpis?.recoverableCentsTodo ??
    kpis?.recoverableTotal ??
    kpis?.recoverableCents ??
    0;

  const recoveredToday =
    kpis?.recoveredCentsToday ?? kpis?.recoveredTodayCents ?? 0;

  const recoveredLast7d =
    kpis?.recoveredCentsLast7d ?? kpis?.recoveredLast7dCents ?? 0;

  const recoveredLast30d =
    kpis?.recoveredCentsLast30d ?? kpis?.recoveredLast30dCents ?? 0;

  const queued = kpis?.queuedCount ?? kpis?.todoCount ?? 0;
  const handledToday = kpis?.handledToday ?? 0;

  const avgHours7d = num(kpis?.avgHoursToHandle7d, 0);
  const avgBacklogDays = num(kpis?.avgBacklogDays, 0);
  const streak30d = num(kpis?.streak30d, 0);

  const score =
    num(kpis?.recoveryScore, 0) || num(kpis?.score, 0) || num(kpis?.kpiScore, 0);

  const scoreTone =
    score === 0 ? "default" : score >= 70 ? "good" : score >= 35 ? "default" : "bad";

  return (
    <div className="w-full">
      {/* ===== HERO INSIGHT (optionnel) ===== */}
      {insight ? (
        <div className="mb-4 rounded-2xl border border-red-500/35 bg-red-500/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {insight?.title ?? "🧠 Insight Recovery"}
              </p>
              <p className="mt-2 text-sm text-slate-200/90">
                {insight?.description ?? insight?.text ?? "—"}
              </p>
            </div>
            <div className="h-3 w-3 shrink-0 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.55)]" />
          </div>

          {insight?.href ? (
            <Link
              href={insight.href}
              className="mt-4 inline-flex rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-red-500/15"
            >
              Voir le détail →
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ===== KPI GRID ===== */}
      <section className="grid gap-3 md:grid-cols-5">
        <Card
          title="Valeur récupérable"
          value={moneyFromCents(recoverable)}
          icon="💰"
          tone="accent"
          href="/audit?focus=revenue&autoSelect=top"
        />
        <Card
          title="Récupéré aujourd’hui"
          value={moneyFromCents(recoveredToday)}
          icon="✅"
          tone="good"
          href="/audit?focus=history&autoSelect=latest&history=7d"
        />
        <Card
          title="Récupéré (7 jours)"
          value={moneyFromCents(recoveredLast7d)}
          icon="📆"
          tone="good"
          href="/audit?focus=history&autoSelect=latest&history=7d"
        />
        <Card
          title="Récupéré (30 jours)"
          value={moneyFromCents(recoveredLast30d)}
          icon="📈"
          tone="good"
          href="/audit?focus=history&autoSelect=latest&history=30d"
        />
        <Card
          title="Recovery Score"
          value={`${Math.round(score)}/100`}
          icon="⚡"
          tone={scoreTone}
          sub={score === 0 ? "Aucune action requise" : "Basé sur les 30 jours"}
          href="/audit?focus=score"
        />
      </section>

      {/* ===== SECOND ROW ===== */}
      <section className="mt-4 grid gap-3 md:grid-cols-4">
        <Card
          title="En attente"
          value={`${Math.round(num(queued, 0))}`}
          icon="🧾"
          tone="default"
          href="/audit?focus=queue&autoSelect=top"
        />
        <Card
          title="Traités aujourd’hui"
          value={`${Math.round(num(handledToday, 0))}`}
          icon="🟢"
          tone="good"
          href="/audit?focus=handled&autoSelect=latest"
        />
        <Card
          title="Temps moyen (7j)"
          value={`${avgHours7d.toFixed(1)} h`}
          icon="⏱️"
          tone="default"
          href="/audit?focus=delay&autoSelect=top&history=7d"
        />
        <Card
          title="Backlog moyen"
          value={`${avgBacklogDays.toFixed(1)} j`}
          icon="📦"
          tone="default"
          href="/audit?focus=delay&autoSelect=top&history=30d"
        />
      </section>

      {/* ===== BREAKDOWN ===== */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-slate-100">Breakdown par type</p>
          <p className="text-xs text-slate-300/70">Top 8</p>

          <div className="mt-4 space-y-2">
            {(breakdown?.byType ?? []).length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300/70">
                Aucune donnée.
              </div>
            ) : (
              (breakdown.byType ?? []).map((x: any) => (
                <div
                  key={`${x.key}-${x.count}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                >
                  <span className="text-sm text-slate-100">{String(x.key)}</span>
                  <span className="text-sm font-semibold text-slate-100">
                    {Math.round(num(x.count, 0))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-slate-100">
            Breakdown par sévérité
          </p>
          <p className="text-xs text-slate-300/70">Top 8</p>

          <div className="mt-4 space-y-2">
            {(breakdown?.bySeverity ?? []).length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300/70">
                Aucune donnée.
              </div>
            ) : (
              (breakdown.bySeverity ?? []).map((x: any) => (
                <div
                  key={`${x.key}-${x.count}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                >
                  <span className="text-sm text-slate-100">{String(x.key)}</span>
                  <span className="text-sm font-semibold text-slate-100">
                    {Math.round(num(x.count, 0))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===== TREND (simple) ===== */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Trend</p>
            <p className="text-xs text-slate-300/70">
              (placeholder V1 — on le rendra sexy après)
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200/80">
            🔥 Streak 30 jours: <span className="font-semibold">{streak30d}</span>
          </div>
        </div>

        <pre className="mt-4 max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-3 text-[11px] text-slate-200/80">
{JSON.stringify(trend ?? [], null, 2)}
        </pre>
      </section>
    </div>
  );
}
