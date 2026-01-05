// app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONTAINER = "mx-auto w-full max-w-[1500px] px-6 lg:px-8";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return clamp(Math.round((n / d) * 100), 0, 100);
}

function formatMoneyCAD(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

function addOrReplaceQuery(path: string, params: Record<string, string | null | undefined>) {
  const url = new URL(path, "http://local");
  for (const [k, v] of Object.entries(params)) {
    if (!v) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  return url.toString().replace("http://local", "");
}

function getLocalDayKeyQuebec(d: Date) {
  // V1 simple (ISO day key)
  return d.toISOString().slice(0, 10);
}

function computeStreak(dayKeys: string[]) {
  const set = new Set(dayKeys);
  if (set.size === 0) return 0;

  const todayKey = getLocalDayKeyQuebec(new Date());
  const toDate = (k: string) => new Date(k + "T00:00:00.000Z");
  const toKey = (d: Date) => d.toISOString().slice(0, 10);

  let streak = 0;
  let cursor = toDate(todayKey);

  const hasToday = set.has(todayKey);
  if (!hasToday) cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);

  while (true) {
    const k = toKey(cursor);
    if (!set.has(k)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

export default async function DashboardHome() {
  // Dernier audit
  const runs = await prisma.auditRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { id: true, createdAt: true },
  });

  const lastRun = runs[0] ?? null;

  const lastRunFindings = lastRun
    ? await prisma.recoveryFinding.findMany({
        where: { auditRunId: lastRun.id },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          severity: true,
          createdAt: true,
          handled: true,
          handledAt: true,
          valueCents: true,
        },
      })
    : [];

  const active = lastRunFindings.filter((f) => !f.handled);
  const activeCount = active.length;
  const potentialCents = active.reduce((sum, f) => sum + (f.valueCents ?? 0), 0);

  // 30 jours stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const statsFindings30d = await prisma.recoveryFinding.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: "desc" },
    distinct: ["type"], // V1 dédoublé
    select: {
      handled: true,
      handledAt: true,
      valueCents: true,
      createdAt: true,
    },
  });

  const total30d = statsFindings30d.length;
  const treated30d = statsFindings30d.filter((f) => f.handled).length;
  const executionPct = pct(treated30d, total30d);

  const recovered30dCents = statsFindings30d
    .filter((f) => f.handled)
    .reduce((sum, f) => sum + (f.valueCents ?? 0), 0);

  const streakDayKeys = statsFindings30d
    .filter((f) => f.handledAt)
    .map((f) => getLocalDayKeyQuebec(new Date(f.handledAt as any)));

  const streak = computeStreak(Array.from(new Set(streakDayKeys)).sort());

  // Next Best Action (urgent-first)
  const heroList = active
    .filter((f) => Number(f.severity ?? 0) >= 4)
    .slice()
    .sort((a, b) => {
      const as = Number(a.severity ?? 0);
      const bs = Number(b.severity ?? 0);
      if (as !== bs) return bs - as;

      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      if (at !== bt) return at - bt;

      return (b.valueCents ?? 0) - (a.valueCents ?? 0);
    });

  const firstNBA = heroList[0]?.id ?? active[0]?.id ?? "";
  const goToNBAHref = addOrReplaceQuery("/audit", {
    nbaMode: "urgent",
    nba: firstNBA || "",
  });

  // ✅ Ton rapport est maintenant sur /audit/report (selon tes screenshots)
  const reportHref = addOrReplaceQuery("/audit/report", { client: "Prospect" });

  // ✅ Dashboard principal : je suppose /recovery (change si ton vrai path est autre)
  const dashboardHref = "/recovery";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className={`${CONTAINER} py-10 space-y-8`}>
        {/* Header simple (le header global est déjà dans layout) */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Prospek 360 — Recovery Engine
          </h1>
          <p className="text-sm text-slate-300/80">
            Audit → Activation → Inbox → Paiement
          </p>

          {/* Nav pills (premium dark) */}
          <div className="flex flex-wrap gap-3 pt-3">
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Audit
            </Link>
            <Link
              href="/activation"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Activation
            </Link>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Inbox
            </Link>
            <Link
              href="/paiement"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Paiement
            </Link>

            {/* ✅ Accès Dashboard */}
            <Link
              href={dashboardHref}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* HERO premium */}
        <section
          className={[
            "rounded-3xl border p-6 md:p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.45)]",
            "border-[rgba(195,53,65,0.85)]",
            "bg-gradient-to-r from-[#05060b] via-[#070b16] to-[#0b1227]",
          ].join(" ")}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-[rgba(195,53,65,0.35)] bg-[rgba(195,53,65,0.10)]">
                🔥 Dashboard Recovery
              </div>

              <h2 className="text-xl md:text-2xl font-semibold">
                Ton recovery aujourd’hui
              </h2>

              <p className="text-sm text-white/70">
                Basé sur ton dernier audit
                {lastRun ? ` (${lastRun.createdAt.toLocaleString("fr-CA")})` : ""}.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
              <div className="text-xs text-white/60">Potentiel à récupérer (audit)</div>
              <div className="text-3xl md:text-4xl font-bold leading-tight">
                {formatMoneyCAD(potentialCents)}
              </div>
              <div className="text-xs text-white/60 pt-1">
                {activeCount} opportunité(s) active(s)
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap gap-3">
            <Link
              href={goToNBAHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Continuer l’action recommandée
            </Link>

            <Link
              href={reportHref}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Voir le dernier rapport
            </Link>

            <Link
              href="/audit"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-white/90 hover:bg-white/5"
            >
              Ouvrir Audit
            </Link>
          </div>

          {/* micro-info (si tu veux; sinon enlève) */}
          <div className="pt-4 text-xs text-white/55">
            Astuce : clique “Continuer l’action recommandée” pour passer direct sur la prochaine opportunité à haute valeur.
          </div>
        </section>

        {/* STATS (dark premium) */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="text-xs text-slate-300/70 flex items-center justify-between">
              <span>🔥 Streak (30 jours)</span>
              <span className="text-slate-400/70">aujourd’hui</span>
            </div>
            <div className="pt-2 text-2xl font-semibold text-white">
              {streak} jour{streak > 1 ? "s" : ""}
            </div>
            <div className="pt-1 text-xs text-slate-300/70">Objectif : 1 action / jour</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="text-xs text-slate-300/70">Récupéré (30j)</div>
            <div className="pt-2 text-2xl font-semibold text-white">
              {formatMoneyCAD(recovered30dCents)}
            </div>
            <div className="pt-1 text-xs text-slate-300/70">
              Cumul 30 jours (normal si tu as peu de leads).
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="text-xs text-slate-300/70">Exécution (30j)</div>
            <div className="pt-2 text-2xl font-semibold text-white">{executionPct}%</div>

            <div className="pt-3">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-white/70"
                  style={{ width: `${executionPct}%` }}
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-300/70">
              {treated30d}/{total30d} types traités (dédoublé)
            </div>
          </div>
        </section>

        {/* MODULES (dark) */}
        <section className="rounded-2xl border border-white/10 bg-slate-950 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Modules</h3>
              <p className="text-sm text-slate-300/70">
                Roadmap V1 — simple, clair, sans surcharge.
              </p>
            </div>

            <Link
              href={dashboardHref}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Accéder au Dashboard →
            </Link>
          </div>

          <div className="pt-5 grid gap-3 md:grid-cols-4">
            <Link
              href="/audit"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06]"
            >
              <div className="text-sm font-semibold text-white">Audit ✅</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Détecter & prioriser les opportunités.
              </div>
            </Link>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">Activation ⏳</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Activer la séquence de relance.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">Inbox ⏳</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Réponses + tri + prochaines actions.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-70">
              <div className="text-sm font-semibold text-white">Paiement ⏳</div>
              <div className="text-xs text-slate-300/70 pt-1">
                Encaisser, suivre, relancer.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
