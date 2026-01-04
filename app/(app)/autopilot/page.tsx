// app/(app)/autopilot/page.tsx
import Link from "next/link";
import AutopilotClient from "@/components/autopilot/AutopilotClient";

export const dynamic = "force-dynamic";

export default function AutopilotPage() {
  return (
    <div className="min-h-screen bg-[#05070f]">
      {/* Body container — EXACTEMENT comme /audit */}
      <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-8 py-8">
        {/* Header de page (si ton AutopilotClient a déjà son header, tu peux enlever ce bloc) */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest text-white/50">PROSPEK360 — RECOVERY ENGINE</div>
            <h1 className="mt-1 text-3xl font-semibold text-white">Auto-Pilot V1</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              File d’exécution : sélection automatique du levier #1 → exécution guidée (sans marquer “traité”
              automatiquement).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

        {/* Contenu Auto-Pilot */}
        <AutopilotClient />
      </div>
    </div>
  );
}
