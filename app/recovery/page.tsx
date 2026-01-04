// app/recovery/page.tsx
import RecoveryDashboardClient from "@/components/recovery/RecoveryDashboardClient";
import { getRecoveryDashboardData } from "@/lib/recoveryMetrics";

export default async function RecoveryPage() {
  const { kpis, trend, breakdown } = await getRecoveryDashboardData();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="text-xs uppercase tracking-wide text-white/50">Prospek360 — Recovery Engine</div>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard global</h1>
          <p className="mt-2 text-sm text-white/70">
            KPI + tendances + insights (basé sur{" "}
            <span className="font-medium text-white/80">handled / handledAt / valueCents</span>).
          </p>
        </header>

        <RecoveryDashboardClient kpis={kpis} trend={trend} breakdown={breakdown} />
      </div>
    </main>
  );
}
