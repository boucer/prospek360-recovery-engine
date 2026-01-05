import Link from "next/link";
import AutopilotClient from "@/components/autopilot/AutopilotClient";

export const dynamic = "force-dynamic";

export default function AutopilotPage() {
  return (
    <div className="min-h-screen bg-[#05070f]">
      {/* HEADER DESKTOP SEULEMENT */}
      <div className="hidden md:block border-b border-white/10">
        <div className="mx-auto max-w-[1500px] px-6 py-6 flex items-start justify-between gap-6">
          <div>
            <div className="text-xs tracking-widest text-white/50">
              PROSPEK360 — RECOVERY ENGINE
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Auto-Pilot
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Sélection automatique du levier prioritaire → exécution guidée,
              sans marquer traité automatiquement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/recovery"
              className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-slate-950/60"
            >
              ← Dashboard
            </Link>
            <Link
              href="/audit"
              className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-slate-950/60"
            >
              Traiter manuellement
            </Link>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="mx-auto w-full max-w-[1500px] px-4 md:px-6 py-6 pb-32">
        <AutopilotClient />
      </div>
    </div>
  );
}
