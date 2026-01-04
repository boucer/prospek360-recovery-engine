// app/autopilot/page.tsx
import AutopilotClient from "@/components/autopilot/AutopilotClient";

export const dynamic = "force-dynamic";

export default function AutoPilotPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/40 to-slate-950/40 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_120px_rgba(0,0,0,0.55)]">
          <div className="text-xs tracking-widest text-slate-400">PROSPEK360 — RECOVERY ENGINE</div>
          <h1 className="mt-2 text-3xl font-semibold">Auto-Pilot V1</h1>
          <p className="mt-2 text-sm text-slate-300">
            File d’exécution : sélection automatique du levier #1 → exécution guidée (sans marquer “traité” automatiquement).
          </p>
        </div>

        <div className="mt-6">
          <AutopilotClient />
        </div>
      </div>
    </div>
  );
}
