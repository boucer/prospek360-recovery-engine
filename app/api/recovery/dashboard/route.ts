// app/api/recovery/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RangeKey = "7d" | "30d" | "90d";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pct(n: number, d: number) {
  if (!d) return 0;
  return clamp(Math.round((n / d) * 100), 0, 100);
}

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangeStart(range: RangeKey) {
  const d = startOfTodayLocal();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d;
}

function fmtMoneyCentsToNumber(cents: number) {
  return Math.round((cents ?? 0) / 100);
}

function bucketKeyForRange(date: Date, range: RangeKey) {
  const d = new Date(date);
  if (range === "7d") {
    // YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }
  if (range === "30d") {
    // semaine relative: S1..S5 (approx, simple & efficace)
    const start = rangeStart("30d");
    const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const week = clamp(Math.floor(diffDays / 7) + 1, 1, 6);
    return `S${week}`;
  }
  // 90d -> mois M1..M3 (approx)
  const start = rangeStart("90d");
  const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const monthBlock = clamp(Math.floor(diffDays / 30) + 1, 1, 4);
  return `M${monthBlock}`;
}

function sortBucketLabels(labels: string[]) {
  // support YYYY-MM-DD, Sx, Mx
  return labels.sort((a, b) => {
    if (a.includes("-") && b.includes("-")) return a.localeCompare(b);
    const ax = parseInt(a.slice(1), 10);
    const bx = parseInt(b.slice(1), 10);
    return ax - bx;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") as RangeKey) || "30d";
  const start = rangeStart(range);

  // 1) Dernier audit run (pour les opportunités actuelles "recoverable")
  const lastRun = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const lastRunFindings = lastRun
    ? await prisma.recoveryFinding.findMany({
        where: { auditRunId: lastRun.id },
        select: {
          id: true,
          type: true,
          title: true,
          severity: true,
          createdAt: true,
          handled: true,
          handledAt: true,
          valueCents: true,
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const unhandledLastRun = lastRunFindings.filter((f) => !f.handled);
  const handledInRange = await prisma.recoveryFinding.findMany({
    where: {
      handled: true,
      handledAt: { not: null, gte: start },
    },
    select: { createdAt: true, handledAt: true, valueCents: true },
    orderBy: { handledAt: "desc" },
    take: 5000,
  });

  // 2) KPIs
  const recoverableTotal = fmtMoneyCentsToNumber(
    unhandledLastRun.reduce((sum, f) => sum + (f.valueCents ?? 0), 0)
  );

  const recoveredTotal = fmtMoneyCentsToNumber(
    handledInRange.reduce((sum, f) => sum + (f.valueCents ?? 0), 0)
  );

  // "lostTotal" V1 (simple & utile): opportunités non traitées du dernier run plus vieilles que la fenêtre sélectionnée
  const lostTotal = fmtMoneyCentsToNumber(
    unhandledLastRun
      .filter((f) => f.createdAt < start)
      .reduce((sum, f) => sum + (f.valueCents ?? 0), 0)
  );

  // 3) Recovery Score (reprend ta logique 30d distinct par type, comme dans /audit)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const statsFindings30d = await prisma.recoveryFinding.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: "desc" },
    distinct: ["type"],
    select: { handled: true },
  });

  const total30d = statsFindings30d.length;
  const treated30d = statsFindings30d.filter((f) => f.handled).length;
  const recoveryScore = pct(treated30d, total30d); // 0-100

  // 4) Avg days to recover (sur la période)
  let avgDaysToRecover = 0;
  if (handledInRange.length) {
    const days = handledInRange
      .map((f) => {
        const a = f.createdAt?.getTime?.() ?? 0;
        const b = f.handledAt?.getTime?.() ?? 0;
        if (!a || !b || b < a) return null;
        return (b - a) / (1000 * 60 * 60 * 24);
      })
      .filter((x): x is number => typeof x === "number");
    if (days.length) {
      avgDaysToRecover = Math.round((days.reduce((s, v) => s + v, 0) / days.length) * 10) / 10;
    }
  }

  // 5) Momentum series
  const recoveredBuckets = new Map<string, number>();
  for (const f of handledInRange) {
    const k = bucketKeyForRange(f.handledAt!, range);
    recoveredBuckets.set(k, (recoveredBuckets.get(k) ?? 0) + fmtMoneyCentsToNumber(f.valueCents ?? 0));
  }

  // "lostSeries" V1: création d’opportunités non traitées (dernier run) dans la période
  const lostBuckets = new Map<string, number>();
  for (const f of unhandledLastRun.filter((x) => x.createdAt >= start)) {
    const k = bucketKeyForRange(f.createdAt, range);
    lostBuckets.set(k, (lostBuckets.get(k) ?? 0) + fmtMoneyCentsToNumber(f.valueCents ?? 0));
  }

  const allLabels = sortBucketLabels(
    Array.from(new Set([...recoveredBuckets.keys(), ...lostBuckets.keys()]))
  );

  const recoveredSeries = allLabels.map((label) => ({
    label,
    value: recoveredBuckets.get(label) ?? 0,
  }));
  const lostSeries = allLabels.map((label) => ({
    label,
    value: lostBuckets.get(label) ?? 0,
  }));

  const totalRecovered = recoveredSeries.reduce((s, x) => s + x.value, 0);
  const totalLost = lostSeries.reduce((s, x) => s + x.value, 0);
  const recoveryRatePct = totalRecovered + totalLost ? Math.round((totalRecovered / (totalRecovered + totalLost)) * 100) : 0;

  // delta vs période précédente (approx V1)
  const prevStart = new Date(start);
  const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  prevStart.setDate(prevStart.getDate() - daysBack);

  const handledPrev = await prisma.recoveryFinding.findMany({
    where: { handled: true, handledAt: { not: null, gte: prevStart, lt: start } },
    select: { valueCents: true },
    take: 5000,
  });
  const recoveredPrev = fmtMoneyCentsToNumber(handledPrev.reduce((s, f) => s + (f.valueCents ?? 0), 0));
  const deltaVsPrevPct = recoveredPrev ? Math.round(((recoveredTotal - recoveredPrev) / recoveredPrev) * 100) : (recoveredTotal ? 100 : 0);

  // 6) Global Action (critique = severity>=4 et âge >= 3 jours)
  const now = Date.now();
  const critical = unhandledLastRun.filter((f) => (f.severity ?? 0) >= 4);
  const criticalAged = critical.filter((f) => (now - f.createdAt.getTime()) >= 72 * 60 * 60 * 1000);

  const criticalCount = criticalAged.length;
  const criticalValue = fmtMoneyCentsToNumber(criticalAged.reduce((s, f) => s + (f.valueCents ?? 0), 0));

  const globalAction = {
    isCritical: criticalCount > 0,
    title:
      criticalCount > 0
        ? `${criticalCount} opportunité(s) critique(s) non traitée(s) (+72h)`
        : "Aucune opportunité critique en retard",
    subtitle:
      criticalCount > 0
        ? "Focus sur les deals à haute valeur — impact immédiat"
        : "Continue le rythme : traite les opportunités restantes",
    potentialValue: criticalValue,
    ctaLabel: criticalCount > 0 ? "Agir maintenant" : "Voir tout",
    href: criticalCount > 0 ? "/audit?nbaMode=urgent" : "/audit?nbaMode=all",
  };

  // 7) Loss sources (Top 5 par valeur) — drilldown via tes vrais modes /audit
  const byType = new Map<string, number>();
  for (const f of unhandledLastRun) {
    const k = f.type ?? "UNKNOWN";
    byType.set(k, (byType.get(k) ?? 0) + fmtMoneyCentsToNumber(f.valueCents ?? 0));
  }

  const typeToLabel: Record<string, string> = {
    NO_REPLY_7D: "Leads non contactés",
  };

  const lossSources = Array.from(byType.entries())
    .map(([key, value]) => {
      const label = typeToLabel[key] ?? "Opportunités non traitées";
      const href = key === "NO_REPLY_7D" ? "/audit?nbaMode=noreply" : "/audit?nbaMode=all";
      return { key, label, value, href };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 8) Motivation (streak: jours consécutifs avec au moins 1 action)
  const handled30d = await prisma.recoveryFinding.findMany({
    where: { handled: true, handledAt: { not: null, gte: thirtyDaysAgo } },
    select: { handledAt: true, valueCents: true },
    take: 5000,
  });

  const dayKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  };

  const actionsByDay = new Map<string, number>();
  for (const f of handled30d) {
    const k = dayKey(f.handledAt!);
    actionsByDay.set(k, (actionsByDay.get(k) ?? 0) + fmtMoneyCentsToNumber(f.valueCents ?? 0));
  }

  let streakDays = 0;
  const cursor = startOfTodayLocal();
  for (let i = 0; i < 60; i++) {
    const k = cursor.toISOString().slice(0, 10);
    if (actionsByDay.has(k)) streakDays += 1;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }

  let bestDayValue = 0;
  for (const v of actionsByDay.values()) bestDayValue = Math.max(bestDayValue, v);

  const insight =
    deltaVsPrevPct >= 10
      ? `Tu accélères : ~${Math.abs(deltaVsPrevPct)}% de valeur récupérée en plus que la période précédente.`
      : deltaVsPrevPct <= -10
      ? `Petit creux : ~${Math.abs(deltaVsPrevPct)}% de valeur récupérée en moins — focus sur les urgents.`
      : "Rythme stable. Un sprint sur les urgents te donnera un boost net.";

  const lastRunLabel = lastRun?.createdAt
    ? (() => {
        const diffMs = Date.now() - lastRun.createdAt.getTime();
        const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
        if (hours < 24) return `il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `il y a ${days}j`;
      })()
    : "—";

  return NextResponse.json({
    lastRunLabel,
    kpis: {
      recoverableTotal,
      recoveredTotal,
      lostTotal,
      recoveryScore,
      avgDaysToRecover,
    },
    momentum: {
      range,
      recoveredSeries,
      lostSeries,
      recoveryRatePct,
      deltaVsPrevPct,
    },
    globalAction,
    lossSources,
    motivation: {
      streakDays,
      bestDayValue,
      insight,
    },
  });
}
