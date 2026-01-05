// app/(app)/autopilot/page.tsx
import AutopilotClient from "@/components/autopilot/AutopilotClient";

export const dynamic = "force-dynamic";

export default function AutoPilotPage() {
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

        {/* Sur desktop, tu peux ajouter des boutons ici si tu veux.
            Mais comme tu as déjà le hamburger + Accueil dans le layout,
            on garde clean pour éviter la surcharge. */}
      </div>

      <AutopilotClient />
    </div>
  );
}
