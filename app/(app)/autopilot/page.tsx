// app/(app)/autopilot/page.tsx
import AutopilotClient from "@/components/autopilot/AutopilotClient";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default function AutoPilotPage({ searchParams }: { searchParams?: SP }) {
  return (
    <div className="w-full">
      {/* Header interne de page (comme Audit/Recovery) */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Auto-Pilot
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Enchaîne les actions Recovery automatiquement, étape par étape.
          </p>
        </div>
      </div>

      {/* ✅ On passe les searchParams au client pour éviter le "flicker"
          et rendre le contexte importé fiable */}
      <AutopilotClient initialSearchParams={searchParams} />
    </div>
  );
}
