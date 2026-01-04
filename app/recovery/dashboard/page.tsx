// app/recovery/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Recovery Dashboard | Prospek 360",
};

export const dynamic = "force-dynamic";

export type RangeKey = "7d" | "30d" | "90d";

export type DashboardMetrics = {
  lastRunLabel: string;

  kpis: {
    recoverableTotal: number;
    recoveredTotal: number;
    lostTotal: number;
    recoveryScore: number; // 0-100
    avgDaysToRecover: number;
  };

  momentum: {
    range: RangeKey;
    recoveredSeries: Array<{ label: string; value: number }>;
    lostSeries: Array<{ label: string; value: number }>;
    recoveryRatePct: number; // 0-100
    deltaVsPrevPct: number; // ex: +12
  };

  globalAction: {
    isCritical: boolean;
    title: string;
    subtitle: string;
    potentialValue: number;
    ctaLabel: string;

    // drilldown vers /audit (on accepte des nouveaux params)
    // ex: /audit?focus=revenue&autoSelect=critical
    href: string;
  };

  lossSources: Array<{
    key: string;
    label: string;
    value: number;
    href: string; // drilldown vers /audit
  }>;

  motivation: {
    streakDays: number;
    bestDayValue: number;
    insight: string;
  };
};

async function getInitialMetrics(range: RangeKey): Promise<DashboardMetrics> {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const res = await fetch(`${base}/api/recovery/dashboard?range=${range}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      lastRunLabel: "—",
      kpis: {
        recoverableTotal: 0,
        recoveredTotal: 0,
        lostTotal: 0,
        recoveryScore: 0,
        avgDaysToRecover: 0,
      },
      momentum: {
        range,
        recoveredSeries: [],
        lostSeries: [],
        recoveryRatePct: 0,
        deltaVsPrevPct: 0,
      },
      globalAction: {
        isCritical: false,
        title: "Données indisponibles",
        subtitle: "Réessaie dans un instant.",
        potentialValue: 0,
        ctaLabel: "Ouvrir Audit",
        href: "/audit?focus=score&autoSelect=top",
      },
      lossSources: [],
      motivation: {
        streakDays: 0,
        bestDayValue: 0,
        insight: "—",
      },
    };
  }

  return res.json();
}

function normalizeRange(raw?: string): RangeKey {
  if (raw === "7d" || raw === "90d") return raw;
  return "30d";
}

export default async function RecoveryDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const range = normalizeRange(sp.range);
  const metrics = await getInitialMetrics(range);

  const fixedMetrics: DashboardMetrics = {
    ...metrics,
    momentum: {
      ...metrics.momentum,
      range,
    },
  };

  return <DashboardClient initialMetrics={fixedMetrics} />;
}
