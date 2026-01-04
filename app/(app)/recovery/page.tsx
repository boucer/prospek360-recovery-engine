// app/(app)/recovery/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RecoveryDashboardClient from "@/components/recovery/RecoveryDashboardClient";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDayKey(d: Date) {
  // YYYY-MM-DD (stable + simple)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoursBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 36e5);
}

export default async function RecoveryPage() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  // Récupère un dataset raisonnable (on calcule en JS pour éviter du SQL date-grouping)
  // Ajuste le "take" si besoin plus tard.
  const findings = await prisma.recoveryFinding.findMany({
    select: {
      id: true,
      type: true,
      severity: true,
      handled: true,
      handledAt: true,
      updatedAt: true,
      createdAt: true,
      valueCents: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  });

  // ===== KPIs =====
  const todo = findings.filter((f) => !f.handled);
  const done = findings.filter((f) => f.handled);

  const todoCount = todo.length;
  const queuedCount = todoCount; // pour l’instant: “en auto-pilot” = TODO (tu raffineras quand la queue sera en DB)
  const handledToday = done.filter((f) => f.handledAt && fmtDayKey(f.handledAt) === fmtDayKey(now)).length;

  const recoveredCentsLast7d = done
    .filter((f) => f.handledAt && f.handledAt >= d7)
    .reduce((s, f) => s + (f.valueCents ?? 0), 0);

  const recoveredCentsLast30d = done
    .filter((f) => f.handledAt && f.handledAt >= d30)
    .reduce((s, f) => s + (f.valueCents ?? 0), 0);

  // avgHoursToHandle7d: temps moyen entre updatedAt (ou createdAt) et handledAt sur 7 jours
  const handled7d = done.filter((f) => f.handledAt && f.handledAt >= d7);
  const avgHoursToHandle7d =
    handled7d.length === 0
      ? 0
      : handled7d.reduce((s, f) => {
          const start = f.updatedAt ?? f.createdAt;
          return s + hoursBetween(start, f.handledAt!);
        }, 0) / handled7d.length;

  // avgBacklogDays: âge moyen des TODO (basé sur updatedAt)
  const avgBacklogDays =
    todo.length === 0
      ? 0
      : todo.reduce((s, f) => s + (now.getTime() - (f.updatedAt ?? f.createdAt).getTime()), 0) /
        todo.length /
        (24 * 3600 * 1000);

  // streak30d: jours consécutifs (max 30) avec recovered > 0
  const recoveredByDay = new Map<string, number>();
  for (const f of done) {
    if (!f.handledAt) continue;
    if (f.handledAt < d30) continue;
    const k = fmtDayKey(f.handledAt);
    recoveredByDay.set(k, (recoveredByDay.get(k) ?? 0) + (f.valueCents ?? 0));
  }
  let streak30d = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date(startOfDay(now).getTime() - i * 24 * 3600 * 1000);
    const k = fmtDayKey(day);
    if ((recoveredByDay.get(k) ?? 0) > 0) streak30d++;
    else break;
  }

  const kpis = {
    todoCount,
    queuedCount,
    handledToday,
    recoveredCentsLast7d,
    recoveredCentsLast30d,
    avgHoursToHandle7d,
    streak30d,
    avgBacklogDays,

     // ✅ champs manquants requis par RecoveryKpis
  recoverableCentsTodo: 0,
  avgBacklogAgeDaysTodo: avgBacklogDays ?? 0,
  handledLast7d: 0,
  handledLast30d: 0,
  recoveredCentsToday: 0,
  };

  // ===== Trend 7 jours =====
  const trend = Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(startOfDay(now).getTime() - (6 - idx) * 24 * 3600 * 1000);
    const key = fmtDayKey(day);
    return { day: key, handled: 0, recoveredCents: 0 };
  });

  const idxByDay = new Map(trend.map((t, i) => [t.day, i]));
  for (const f of done) {
    if (!f.handledAt) continue;
    const key = fmtDayKey(f.handledAt);
    const i = idxByDay.get(key);
    if (i === undefined) continue;
    trend[i].handled += 1;
    trend[i].recoveredCents += f.valueCents ?? 0;
  }

  // ===== Breakdown =====
  const byTypeMap = new Map<string, number>();
  const bySevMap = new Map<number, number>();
  for (const f of todo) {
    byTypeMap.set(f.type, (byTypeMap.get(f.type) ?? 0) + 1);
    bySevMap.set(f.severity, (bySevMap.get(f.severity) ?? 0) + 1);
  }

  const breakdown = {
  byType: Array.from(byTypeMap.entries())
    .map(([key, count]) => ({ key: String(key), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8),

  bySeverity: Array.from(bySevMap.entries())
    .map(([key, count]) => ({ key: String(key), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8),
};

  // ===== Insight directionnel (simple mais utile) =====
  const insight =
    todoCount === 0
      ? {
          title: "Tout est sous contrôle",
          message: "Aucune opportunité critique en retard. Continue le rythme : traite les opportunités restantes.",
        }
      : {
          title: "Momentum facile",
          message: `Il reste ${todoCount} item(s) à traiter. Un mini-sprint de 15 minutes peut te donner un “WOW” immédiat.`,
        };

  return (
  <div className="min-h-screen bg-[#05070f]">
    {/* DESKTOP HEADER */}
    <div className="hidden md:block border-b border-white/10">
      <div className="mx-auto max-w-[1500px] px-6 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Recovery</h1>
          <p className="text-sm text-white/60">
            Dernière analyse en temps réel
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/audit"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Ouvrir Audit
          </Link>
          <Link
            href="/autopilot"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Ouvrir Auto-Pilot
          </Link>
        </div>
      </div>
    </div>

    {/* BODY */}
    <div className="mx-auto max-w-[1500px] px-4 md:px-6 py-6 pb-32">
      <RecoveryDashboardClient
        kpis={kpis}
        trend={trend}
        breakdown={breakdown}
        insight={insight}
      />
    </div>

    {/* MOBILE STICKY BAR */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="rounded-2xl border border-red-500/30 bg-slate-950/90 backdrop-blur">
        <div className="px-4 py-3">
          <p className="text-xs text-white/60">Prochaine étape</p>
          <p className="text-sm font-semibold text-white">
            Continuer l’action prioritaire
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <Link
            href="/audit"
            className="rounded-xl bg-red-500/15 border border-red-500/40 py-3 text-center text-sm font-semibold text-white"
          >
            Ouvrir Audit
          </Link>
          <Link
            href="/autopilot"
            className="rounded-xl bg-white/5 border border-white/10 py-3 text-center text-sm font-semibold text-white"
          >
            Auto-Pilot
          </Link>
        </div>
      </div>
    </div>
  </div>
);
}
