"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  kpis: any;
  trend: any[];
  breakdown: any;
  insight?: {
    title?: string;
    description?: string;
    href?: string;
  };
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

function pickKpi(obj: any, keys: string[], fallback: any) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
}

function Card({
  title,
  value,
  sub,
  href,
  tone = "default",
  icon,
  compact = false,
}: {
  title: string;
  value: string;
  sub?: string;
  href?: string;
  icon?: string;
  compact?: boolean;
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
    <div className={`rounded-2xl border ${toneClasses} shadow-sm`}>
      <div className={`${compact ? "p-3" : "p-4"} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-300/80">{title}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-100">
            {value}
          </p>
          {sub ? <p className="mt-1 text-[11px] text-slate-300/70">{sub}</p> : null}
        </div>
        {icon ? (
          <div className="shrink-0 rounded-xl border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-200/90">
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

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-300/70">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function RecoveryDashboardClient({ kpis, trend, breakdown, insight }: Props) {
  // ----- KPI mapping (tolérant aux clés différentes)
  const recoverable = pickKpi(
    kpis,
    ["recoverableCentsTodo", "recoverableCents", "recoverableTotalCents", "recoverableTotal"],
    0
  );

  const recovered7d = pickKpi(
    kpis,
    ["recovered7dCents", "recoveredLast7dCents", "recovered7d", "recoveredLast7d"],
    0
  );

  const recovered30d = pickKpi(
    kpis,
    ["recovered30dCents", "recoveredLast30dCents", "recovered30d", "recoveredLast30d"],
    0
  );

  const score = num(pickKpi(kpis, ["recoveryScore", "score"], 0), 0);
  const avgBacklogDays = num(pickKpi(kpis, ["avgBacklogDays", "backlogAvgDays"], 0), 0);

  const pendingCount = num(pickKpi(kpis, ["pendingCount", "pending", "todoCount"], 0), 0);
  const handledToday = num(pickKpi(kpis, ["handledToday", "handledTodayCount", "treatedToday"], 0), 0);
  const avgHours7d = num(pickKpi(kpis, ["avgHours7d", "avgHandleHours7d", "avgTimeHours7d"], 0), 0);
  const streak30d = num(pickKpi(kpis, ["streak30d", "streak"], 0), 0);

  // ----- Breakdown safe lists
  const byType = useMemo(() => breakdown?.byType ?? breakdown?.types ?? [], [breakdown]);
  const bySeverity = useMemo(() => breakdown?.bySeverity ?? breakdown?.severity ?? [], [breakdown]);

  // ----- Sticky anti-overlap (si un autre fixed bottom existe, on remonte le nôtre)
  const [stickyOffset, setStickyOffset] = useState(0);

  useEffect(() => {
    // Heuristique simple: si un élément "fixed bottom-0" existe déjà, on se décale.
    // (Ça évite la superposition visuelle même si on ne supprime pas encore l'autre sticky.)
    const els = Array.from(document.querySelectorAll<HTMLElement>("body *"));
    const found = els.find((el) => {
      const s = window.getComputedStyle(el);
      if (s.position !== "fixed") return false;
      if (s.bottom !== "0px") return false;
      const h = el.getBoundingClientRect().height;
      return h >= 48; // un vrai bar
    });
    if (found) {
      const h = Math.min(90, Math.max(56, Math.round(found.getBoundingClientRect().height)));
      setStickyOffset(h + 10);
    } else {
      setStickyOffset(0);
    }
  }, []);

  // ----- Next step (focus)
  const nextTitle =
    pendingCount > 0 ? "Continuer l’action prioritaire" : "Lancer un nouvel audit";
  const nextSubtitle =
    pendingCount > 0
      ? "Revenir à l’opportunité la plus rentable maintenant."
      : "Scanner et générer de nouvelles opportunités de recovery.";

  // NOTE: on garde les boutons en haut sur desktop via header de page.
  // Ici, on optimise mobile (sticky + carte compacte).
  return (
    <div className="w-full">
      {/* ===== Insight (si présent) ===== */}
      {insight ? (
        <div className="mb-4 rounded-2xl border border-red-500/35 bg-red-500/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">{insight.title ?? "Momentum facile"}</p>
              <p className="mt-2 text-sm text-slate-200/85">
                {insight.description ??
                  `Il reste ${pendingCount} item(s) à traiter. Un mini-sprint de 15 minutes peut te donner un “WOW” immédiat.`}
              </p>
            </div>
            <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.55)]" />
          </div>

          {insight.href ? (
            <Link
              href={insight.href}
              className="mt-4 inline-flex rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-red-500/15"
            >
              Voir le détail →
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* ===== KPI GRID : Mobile = 2 colonnes compactes / Desktop = layout existant ===== */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card
          title="Valeur récupérable"
          value={moneyFromCents(recoverable)}
          icon="💰"
          tone="accent"
          compact
          href="/audit?focus=revenue&autoSelect=top"
        />
        <Card
          title="Récupéré (7 jours)"
          value={moneyFromCents(recovered7d)}
          icon="📆"
          tone="good"
          compact
          href="/audit?focus=history&autoSelect=latest&history=7d"
        />
        <Card
          title="Récupéré (30 jours)"
          value={moneyFromCents(recovered30d)}
          icon="📈"
          tone="good"
          compact
          href="/audit?focus=history&autoSelect=latest&history=30d"
        />
        <Card
          title="Recovery Score"
          value={`${Math.round(score)}/100`}
          icon="⚡"
          tone={score >= 70 ? "good" : score >= 35 ? "default" : "bad"}
          compact
          href="/audit?focus=priority&autoSelect=top"
        />
        <Card
          title="Backlog moyen"
          value={`${avgBacklogDays.toFixed(1)} j`}
          icon="📦"
          tone="default"
          compact
          href="/audit?focus=delay&autoSelect=top&history=30d"
        />

        <Card
          title="En attente"
          value={`${Math.round(pendingCount)}`}
          icon="🧾"
          tone="default"
          compact
          href="/audit?focus=priority&autoSelect=top"
        />
        <Card
          title="Traités aujourd’hui"
          value={`${Math.round(handledToday)}`}
          icon="🟢"
          tone="good"
          compact
          href="/audit?focus=history&autoSelect=latest&history=7d"
        />
        <Card
          title="Temps moyen (7j)"
          value={`${avgHours7d.toFixed(1)} h`}
          icon="⏱️"
          tone="default"
          compact
          href="/audit?focus=history&autoSelect=latest&history=30d"
        />
        <Card
          title="Streak 30 jours"
          value={`${Math.round(streak30d)}`}
          icon="🔥"
          tone="default"
          compact
          href="/audit?focus=history&autoSelect=latest&history=30d"
        />
      </section>

      {/* ===== Focus next step (desktop inline, mobile sticky + inline) ===== */}
      <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 md:p-5">
        <p className="text-xs text-slate-300/70">Prochaine étape</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{nextTitle}</p>
        <p className="mt-1 text-xs text-slate-200/70">{nextSubtitle}</p>

        <div className="mt-4 hidden md:flex gap-2">
          <Link
            href="/audit"
            className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-slate-950/60"
          >
            Ouvrir Audit
          </Link>
          <Link
            href="/autopilot"
            className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-slate-950/60"
          >
            Ouvrir Auto-Pilot
          </Link>
        </div>
      </div>

      {/* ===== Breakdown (condensé) ===== */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section title="Breakdown par type" subtitle="Top 8">
          <div className="space-y-2">
            {(byType ?? []).slice(0, 8).map((row: any, i: number) => {
              const label = row?.type ?? row?.key ?? row?.name ?? `Type ${i + 1}`;
              const count = num(row?.count ?? row?.value ?? row?.total, 0);
              return (
                <div
                  key={`${label}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
                >
                  <span className="text-xs text-slate-100">{String(label)}</span>
                  <span className="text-xs font-semibold text-slate-200/90">{count}</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Breakdown par sévérité" subtitle="Top 8">
          <div className="space-y-2">
            {(bySeverity ?? []).slice(0, 8).map((row: any, i: number) => {
              const label = row?.severity ?? row?.key ?? row?.name ?? `Sév ${i + 1}`;
              const count = num(row?.count ?? row?.value ?? row?.total, 0);
              return (
                <div
                  key={`${label}-${i}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
                >
                  <span className="text-xs text-slate-100">{String(label)}</span>
                  <span className="text-xs font-semibold text-slate-200/90">{count}</span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ===== Trend (compact via <details>) ===== */}
      <div className="mt-5">
        <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer list-none select-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">Trend</p>
                <p className="text-xs text-slate-300/70">(placeholder V1 — on le rendra sexy après)</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-slate-200/80">
                🔥 Streak 30 jours: <span className="font-semibold">{streak30d}</span>
              </div>
            </div>
          </summary>

          <pre className="mt-4 max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-slate-950/40 p-3 text-[11px] text-slate-200/80">
{JSON.stringify(trend ?? [], null, 2)}
          </pre>
        </details>
      </div>

      {/* ===== Sticky mobile (un seul, et on se décale si autre sticky existe déjà) ===== */}
      <div
        className="md:hidden fixed left-0 right-0 z-[70] px-3"
        style={{
          bottom: `calc(env(safe-area-inset-bottom) + ${8 + stickyOffset}px)`,
        }}
      >
        <div className="rounded-2xl border border-red-500/25 bg-slate-950/85 backdrop-blur-md p-3 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
          <p className="text-[11px] text-slate-300/70">Prochaine étape</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">{nextTitle}</p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/audit"
              className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-slate-100 hover:bg-red-500/15"
            >
              Ouvrir Audit
            </Link>
            <Link
              href="/autopilot"
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-center text-sm font-semibold text-slate-100 hover:bg-white/15"
            >
              Auto-Pilot
            </Link>
          </div>
        </div>
      </div>

      {/* padding safe pour le sticky */}
      <div className="h-28 md:h-0" />
    </div>
  );
}
