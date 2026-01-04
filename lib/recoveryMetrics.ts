// lib/recoveryMetrics.ts
import { prisma } from "@/lib/prisma";

export type RecoveryKpis = {
  todoCount: number;
  queuedCount: number;

  handledToday: number;
  handledLast7d: number;
  handledLast30d: number;

  recoveredCentsToday: number;
  recoveredCentsLast7d: number;
  recoveredCentsLast30d: number;

  avgHoursToHandle7d: number | null;
  streak30d: number;
};

export type RecoveryBreakdown = {
  byType: Array<{ key: string; count: number }>;
  bySeverity: Array<{ key: string; count: number }>;
};

export type RecoveryTrendPoint = {
  day: string; // YYYY-MM-DD
  handled: number;
  recoveredCents: number;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function subDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
}

function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayKey(d: Date) {
  return yyyyMmDd(startOfDay(d));
}

/**
 * Rules:
 * - TODO: handled=false
 * - Handled date: handledAt ?? updatedAt
 * - $ recovered: SUM(valueCents) only for handled=true
 * - Auto-Pilot queue: autopilotQueued=true (does NOT mark handled)
 */
export async function getRecoveryDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const last7Start = startOfDay(subDays(now, 6));
  const last30Start = startOfDay(subDays(now, 29));

  // KPI counts
  const [
    todoCount,
    queuedCount,
    handledToday,
    handledLast7d,
    handledLast30d,
  ] = await Promise.all([
    prisma.recoveryFinding.count({ where: { handled: false } }),
    prisma.recoveryFinding.count({ where: { handled: false, autopilotQueued: true } }),

    prisma.recoveryFinding.count({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: todayStart } },
          { handledAt: null, updatedAt: { gte: todayStart } },
        ],
      },
    }),

    prisma.recoveryFinding.count({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: last7Start } },
          { handledAt: null, updatedAt: { gte: last7Start } },
        ],
      },
    }),

    prisma.recoveryFinding.count({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: last30Start } },
          { handledAt: null, updatedAt: { gte: last30Start } },
        ],
      },
    }),
  ]);

  // $ recovered sums
  const [sumToday, sum7d, sum30d] = await Promise.all([
    prisma.recoveryFinding.aggregate({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: todayStart } },
          { handledAt: null, updatedAt: { gte: todayStart } },
        ],
      },
      _sum: { valueCents: true },
    }),
    prisma.recoveryFinding.aggregate({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: last7Start } },
          { handledAt: null, updatedAt: { gte: last7Start } },
        ],
      },
      _sum: { valueCents: true },
    }),
    prisma.recoveryFinding.aggregate({
      where: {
        handled: true,
        OR: [
          { handledAt: { gte: last30Start } },
          { handledAt: null, updatedAt: { gte: last30Start } },
        ],
      },
      _sum: { valueCents: true },
    }),
  ]);

  const recoveredCentsToday = sumToday._sum.valueCents ?? 0;
  const recoveredCentsLast7d = sum7d._sum.valueCents ?? 0;
  const recoveredCentsLast30d = sum30d._sum.valueCents ?? 0;

  // Avg hours to handle (7d): createdAt -> (handledAt ?? updatedAt)
  const handled7dRows = await prisma.recoveryFinding.findMany({
    where: {
      handled: true,
      OR: [
        { handledAt: { gte: last7Start } },
        { handledAt: null, updatedAt: { gte: last7Start } },
      ],
    },
    select: { createdAt: true, updatedAt: true, handledAt: true },
    take: 5000,
  });

  const hours = handled7dRows
    .map((r) => {
      const end = r.handledAt ?? r.updatedAt;
      const ms = end.getTime() - r.createdAt.getTime();
      return ms > 0 ? ms / (1000 * 60 * 60) : null;
    })
    .filter((x): x is number => typeof x === "number");

  const avgHoursToHandle7d =
    hours.length > 0
      ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
      : null;

  // Trend 7 days (handled/day + $/day)
  const trend: RecoveryTrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfDay(subDays(now, i));
    const nextDayStart = startOfDay(subDays(now, i - 1));

    const [count, sum] = await Promise.all([
      prisma.recoveryFinding.count({
        where: {
          handled: true,
          OR: [
            { handledAt: { gte: dayStart, lt: nextDayStart } },
            { handledAt: null, updatedAt: { gte: dayStart, lt: nextDayStart } },
          ],
        },
      }),
      prisma.recoveryFinding.aggregate({
        where: {
          handled: true,
          OR: [
            { handledAt: { gte: dayStart, lt: nextDayStart } },
            { handledAt: null, updatedAt: { gte: dayStart, lt: nextDayStart } },
          ],
        },
        _sum: { valueCents: true },
      }),
    ]);

    trend.push({
      day: dayKey(dayStart),
      handled: count,
      recoveredCents: sum._sum.valueCents ?? 0,
    });
  }

  // Breakdown TODO (Prisma v6: pas de _all)
  const [byTypeRaw, bySeverityRaw] = await Promise.all([
    prisma.recoveryFinding.groupBy({
      by: ["type"],
      where: { handled: false },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.recoveryFinding.groupBy({
      by: ["severity"],
      where: { handled: false },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  const breakdown: RecoveryBreakdown = {
    byType: byTypeRaw.map((x) => ({ key: x.type, count: x._count.id })),
    bySeverity: bySeverityRaw.map((x) => ({ key: String(x.severity), count: x._count.id })),
  };

  // Streak 30d: jours consécutifs (depuis aujourd’hui) avec >=1 handled
  const handled30Rows = await prisma.recoveryFinding.findMany({
    where: {
      handled: true,
      OR: [
        { handledAt: { gte: last30Start } },
        { handledAt: null, updatedAt: { gte: last30Start } },
      ],
    },
    select: { handledAt: true, updatedAt: true },
    take: 20000,
  });

  const handledDays = new Set(handled30Rows.map((r) => dayKey(r.handledAt ?? r.updatedAt)));

  let streak30d = 0;
  for (let i = 0; i < 30; i++) {
    const k = dayKey(subDays(now, i));
    if (handledDays.has(k)) streak30d++;
    else break;
  }

  const kpis: RecoveryKpis = {
    todoCount,
    queuedCount,
    handledToday,
    handledLast7d,
    handledLast30d,
    recoveredCentsToday,
    recoveredCentsLast7d,
    recoveredCentsLast30d,
    avgHoursToHandle7d,
    streak30d,
  };

  return { kpis, trend, breakdown };
}
