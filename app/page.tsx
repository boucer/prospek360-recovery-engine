// app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  // simple: ISO date (on reste V1). Si tu veux timezone QC exact, on pourra raffiner.
  return d.toISOString().slice(0, 10);
}

function computeStreak(dayKeys: string[]) {
  // dayKeys uniques, triés
  const set = new Set(dayKeys);
  if (set.size === 0) return 0;

  const todayKey = getLocalDayKeyQuebec(new Date());
  const toDate = (k: string) => new Date(k + "T00:00:00.000Z");
  const toKey = (d: Date) => d.toISOString().slice(0, 10);

  let streak = 0;
  let cursor = toDate(todayKey);

  // streak “jusqu’à aujourd’hui” (si aujourd’hui vide, ça part d’hier)
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
    distinct: ["type"], // on garde ta logique “dédoublée” V1
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

  // Calcul “Next Best Action” (même logique que /audit : urgent par défaut)
  const heroList = active
    .filter((f) => Number(f.severity ?? 0) >= 4) // urgent
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

  const viewReportHref = addOrReplaceQuery("/audit", { view: "report" });

  return (
    <main className="p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Prospek 360 — Recovery Engine V1</h1>
        <p className="text-sm text-slate-600">
          Audit → Activation → Inbox → Paiement
        </p>

        <div className="flex gap-3 pt-3">
          <Link
            href="/audit"
            className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Audit
          </Link>
          <Link
            href="/activation"
            className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Activation
          </Link>
          <Link
            href="/inbox"
            className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Inbox
          </Link>
          <Link
            href="/paiement"
            className="px-5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Paiement
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section
        className={[
          "rounded-2xl border p-6 shadow-sm",
          // Prospek360 red/rosé accent (même feel que ton hero audit)
          "border-[rgba(195,53,65,0.7)]",
          "bg-gradient-to-r from-[#05060b] via-[#070b16] to-[#0b1227]",
          "text-white",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-[rgba(195,53,65,0.35)] bg-[rgba(195,53,65,0.10)]">
              🔥 Dashboard Recovery
            </div>

            <h2 className="text-xl font-semibold">Ton recovery aujourd’hui</h2>
            <p className="text-sm text-white/70">
              Basé sur ton dernier audit{lastRun ? ` (${lastRun.createdAt.toLocaleString("fr-CA")})` : ""}.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/60">Potentiel à récupérer (audit)</div>
            <div className="text-3xl font-bold">{formatMoneyCAD(potentialCents)}</div>
            <div className="text-xs text-white/60 pt-1">{activeCount} opportunité(s) active(s)</div>
          </div>
        </div>

        <div className="pt-5 flex flex-wrap gap-3">
          <Link
            href={goToNBAHref}
            className="px-4 py-2 rounded-lg bg-[#c33541] hover:brightness-110 text-white font-semibold"
          >
            Continuer l’action recommandée
          </Link>
          <Link
            href={viewReportHref}
            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white"
          >
            Voir le dernier rapport
          </Link>
          <Link
            href="/audit"
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/90"
          >
            Ouvrir Audit
          </Link>
        </div>
      </section>

      {/* STATS GRID */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>🔥 Streak (30 jours)</span>
            <span className="text-slate-400">aujourd’hui</span>
          </div>
          <div className="pt-2 text-2xl font-semibold">{streak} jour{streak > 1 ? "s" : ""}</div>
          <div className="pt-1 text-xs text-slate-500">Objectif : 1 action / jour</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Récupéré (30j)</div>
          <div className="pt-2 text-2xl font-semibold">{formatMoneyCAD(recovered30dCents)}</div>
          <div className="pt-1 text-xs text-slate-500">
            Normal que ça reste même si tu n’as plus de leads (cumul 30 jours).
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Exécution (30j)</div>
          <div className="pt-2 text-2xl font-semibold">{executionPct}%</div>
          <div className="pt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-slate-900" style={{ width: `${executionPct}%` }} />
          </div>
          <div className="pt-1 text-xs text-slate-500">
            {treated30d}/{total30d} types traités (dédoublé)
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold">Modules</h3>
        <p className="text-sm text-slate-600">Roadmap V1 — simple, clair, sans surcharge.</p>

        <div className="pt-4 grid gap-3 md:grid-cols-4">
          <Link href="/audit" className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
            <div className="text-sm font-semibold">Audit ✅</div>
            <div className="text-xs text-slate-600 pt-1">Détecter & prioriser les opportunités.</div>
          </Link>

          <div className="rounded-lg border border-slate-200 p-4 opacity-70">
            <div className="text-sm font-semibold">Activation ⏳</div>
            <div className="text-xs text-slate-600 pt-1">Activer la séquence de relance.</div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 opacity-70">
            <div className="text-sm font-semibold">Inbox ⏳</div>
            <div className="text-xs text-slate-600 pt-1">Réponses + tri + prochaines actions.</div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 opacity-70">
            <div className="text-sm font-semibold">Paiement ⏳</div>
            <div className="text-xs text-slate-600 pt-1">Encaisser, suivre, relancer.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
