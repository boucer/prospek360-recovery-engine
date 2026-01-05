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
  }).format(n / 100);
}

function num(n: any, fallback = 0) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export default function RecoveryDashboardClient({
  kpis,
  trend,
  breakdown,
  insight,
}: Props) {
  const recovered7d = moneyFromCents(num(kpis?.recovered7dCents));
  const recovered30d = moneyFromCents(num(kpis?.recovered30dCents));
  const recoveredToday = moneyFromCents(num(kpis?.recoveredTodayCents));
  const recoverable = moneyFromCents(num(kpis?.recoverableCents));

  const queued = num(kpis?.queuedCount);
  const handledToday = num(kpis?.handledTodayCount);
  const avgHours7d = num(kpis?.avgHandleHours7d);
  const avgBacklogDays = num(kpis?.avgBacklogDays);
  const score = num(kpis?.score);

  const streak30d = num(kpis?.streak30d);

  return (
    <div className="w-full pb-28 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        {/* HERO */}
        <section className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-black/20 to-black/10 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Momentum facile
                </h2>
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.55)]" />
              </div>

              <p className="mt-2 text-sm text-slate-200/80">
                {queued > 0 ? (
                  <>
                    Il reste <b>{queued}</b> item(s) à traiter. Un mini-sprint de{" "}
                    <b>15 minutes</b> peut te donner un “WOW” immédiat.
                  </>
                ) : (
                  <>Aucune action urgente — mais tu peux lancer un mini-sprint.</>
                )}
              </p>

              {insight?.href ? (
                <Link
                  href={insight.href}
                  className="mt-4 inline-flex rounded-xl border border-red-500/35 bg-red-500/12 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-red-500/18"
                >
                  Voir le détail →
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <KpiCard
            title="Valeur récupérable"
            value={recoverable}
            icon="💰"
            tone="red"
          />
          <KpiCard
            title="Récupéré aujourd’hui"
            value={recoveredToday}
            icon="✅"
            tone="green"
          />
          <KpiCard title="Récupéré (7 jours)" value={recovered7d} icon="📅" tone="green" />
          <KpiCard
            title="Récupéré (30 jours)"
            value={recovered30d}
            icon="📈"
            tone="green"
          />
          <KpiCard
            title="Recovery Score"
            value={`${score}/100`}
            subtitle={score > 0 ? "Momentum en cours" : "Aucune action requise"}
            icon="⚡"
            tone="neutral"
          />
        </section>

        <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <KpiCard title="En attente" value={`${queued}`} icon="🧾" tone="neutral" />
          <KpiCard
            title="Traités aujourd’hui"
            value={`${handledToday}`}
            icon="🟢"
            tone="green"
          />
          <KpiCard
            title="Temps moyen (7j)"
            value={`${avgHours7d.toFixed(1)} h`}
            icon="⏱️"
            tone="neutral"
          />
          <KpiCard
            title="Backlog moyen"
            value={`${avgBacklogDays.toFixed(1)} j`}
            icon="📦"
            tone="neutral"
          />
        </section>

        {/* Breakdown */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Breakdown par type
            </h3>
            <p className="text-xs text-slate-300/60">Top 8</p>

            <div className="mt-3 space-y-2">
              {(breakdown?.byType ?? []).length ? (
                (breakdown.byType ?? []).slice(0, 8).map((row: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
                  >
                    <span className="text-xs text-slate-200/80">
                      {row?.key ?? "—"}
                    </span>
                    <span className="text-xs font-semibold text-slate-100">
                      {num(row?.count)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200/70">
                  Aucun.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Breakdown par sévérité
            </h3>
            <p className="text-xs text-slate-300/60">Top 8</p>

            <div className="mt-3 space-y-2">
              {(breakdown?.bySeverity ?? []).length ? (
                (breakdown.bySeverity ?? [])
                  .slice(0, 8)
                  .map((row: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
                    >
                      <span className="text-xs text-slate-200/80">
                        {row?.key ?? "—"}
                      </span>
                      <span className="text-xs font-semibold text-slate-100">
                        {num(row?.count)}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200/70">
                  Aucun.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Trend (placeholder) */}
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Trend</h3>
              <p className="text-xs text-slate-300/60">
                (placeholder V1 — on le rendra sexy après)
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200/80">
              🔥 Streak 30 jours:{" "}
              <span className="font-semibold">{streak30d}</span>
            </div>
          </div>

          <pre className="mt-4 max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-3 text-[11px] text-slate-200/80">
{JSON.stringify(trend ?? [], null, 2)}
          </pre>
        </section>
      </div>

      {/* MOBILE: Sticky "Prochaine étape" */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div
          className="mx-auto max-w-[520px] px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <div className="rounded-2xl border border-red-500/30 bg-slate-950/92 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-300/70">Prochaine étape</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-100 truncate">
                  {insight?.title || "Continuer l’action prioritaire"}
                </p>
                <p className="mt-1 text-[11px] text-slate-300/70">
                  {typeof kpis?.queuedCount === "number"
                    ? `${kpis.queuedCount} item(s) en attente · mini-sprint 15 min`
                    : "Mini-sprint 15 min · résultat immédiat"}
                </p>
              </div>

              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.55)] animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3">
              <Link
                href={insight?.href || "/audit"}
                className="inline-flex items-center justify-center rounded-xl border border-red-500/35 bg-red-500/12 px-3 py-3 text-sm font-semibold text-slate-100 hover:bg-red-500/18"
              >
                Ouvrir Audit
              </Link>

              <Link
                href="/autopilot"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
              >
                Auto-Pilot
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  tone?: "red" | "green" | "neutral";
}) {
  const toneCls =
    tone === "red"
      ? "border-red-500/30 bg-gradient-to-r from-red-500/10 via-black/20 to-black/10"
      : tone === "green"
      ? "border-emerald-500/25 bg-gradient-to-r from-emerald-500/8 via-black/20 to-black/10"
      : "border-white/10 bg-white/5";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneCls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-300/70">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-300/70">{subtitle}</p>
          ) : null}
        </div>

        {icon ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
