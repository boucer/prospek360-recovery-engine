// app/(app)/recovery/dashboard/types.ts

export type RangeKey = "7d" | "30d" | "90d";

/* =========================
   KPI PRINCIPAUX
========================= */
export type DashboardKpis = {
  recoverableTotal: number;
  recoveredTotal: number;
  lostTotal: number;
  recoveryScore: number;
  avgDaysToRecover: number;

  // Auto-Pilot
  autopilotQueued?: number;
};

/* =========================
   MOMENTUM / ÉVOLUTION
========================= */
export type MomentumSeriesPoint = {
  label: string;
  value: number;
};

export type DashboardMomentum = {
  range?: RangeKey;
  recoveryRatePct?: number;
  deltaVsPrevPct?: number;
  recoveredSeries?: MomentumSeriesPoint[];
  lostSeries?: MomentumSeriesPoint[];
};

/* =========================
   ACTION GLOBALE
========================= */
export type GlobalAction = {
  href?: string;
  label?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  kind?: "primary" | "secondary" | "ghost";
  confidence?: number;
  isCritical?: boolean;
  potentialValue?: number;
};

/* =========================
   SOURCES DE PERTE
========================= */
export type LossSourceItem = {
  key: string;
  label: string;
  value: number;
  href?: string;
};

/* =========================
   MOTIVATION / FEEDBACK
========================= */
export type MotivationBlock = {
  streakDays?: number;
  bestDayValue?: number;
  insight?: string;
};

/* =========================
   BREAKDOWN
========================= */
export type RecoveryBreakdownItem = {
  key: string;
  count: number;
};

export type RecoveryBreakdown = {
  byType: RecoveryBreakdownItem[];
  bySeverity: RecoveryBreakdownItem[];
};

/* =========================
   ROOT METRICS
========================= */
export type DashboardMetrics = {
  kpis?: DashboardKpis;
  momentum?: DashboardMomentum;
  globalAction?: GlobalAction;
  lossSources?: LossSourceItem[];
  motivation?: MotivationBlock;

  lastRunLabel?: string;
};
