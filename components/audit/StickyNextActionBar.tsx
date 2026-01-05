"use client";

import { usePathname } from "next/navigation";

export default function StickyNextActionBar({
  show,
  targetId = "nba-card",
  // ✅ Nouveau: permet de désactiver ce sticky sur certaines pages
  disableOnPaths = ["/recovery", "/autopilot"],
}: {
  show: boolean;
  targetId?: string;
  disableOnPaths?: string[];
}) {
  const pathname = usePathname();

  // ✅ Désactivation propre (évite le double sticky sur Recovery/AutoPilot)
  if (disableOnPaths?.some((p) => pathname?.startsWith(p))) return null;

  if (!show) return null;

  return (
    <div
      className="
        fixed left-0 right-0 bottom-0 z-50 md:hidden
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="mx-auto max-w-3xl px-3 pb-3">
        <div
          className="
            rounded-2xl border
            bg-slate-950/95 backdrop-blur
            border-[rgba(195,53,65,0.55)]
            shadow-[0_0_0_3px_rgba(195,53,65,0.10)]
            px-4 py-3
          "
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate text-white">
                Continuer l’action prioritaire
              </div>
              <div className="text-xs text-white/60 truncate">
                Revenir à l’opportunité à traiter maintenant
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById(targetId);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="
                shrink-0 px-4 py-2 rounded-xl
                bg-[#c33541] text-white
                text-sm font-semibold
                shadow-[0_10px_30px_rgba(195,53,65,0.25)]
                hover:brightness-110 active:scale-[0.98]
              "
            >
              Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
