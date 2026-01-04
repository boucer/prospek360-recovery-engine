"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AuditAutoScroll({
  reportTargetId = "opportunities-section",
}: {
  reportTargetId?: string;
}) {
  const sp = useSearchParams();

  useEffect(() => {
    // On déclenche le scroll si:
    // - view=report (ancien comportement)
    // - OU drilldown (focus / autoSelect)
    // - OU sélection explicite (nba)
    const view = sp.get("view");
    const focus = sp.get("focus");
    const autoSelect = sp.get("autoSelect");
    const nba = sp.get("nba");
    const highlightFindingId = sp.get("highlightFindingId");

    const shouldScroll =
      view === "report" || !!focus || !!autoSelect || !!nba || !!highlightFindingId;

    if (!shouldScroll) return;

    const targetId = highlightFindingId || nba;

    const t = window.setTimeout(() => {
      let el: HTMLElement | null = null;

      // 1) Priorité: ligne précise (nba/highlightFindingId)
      if (targetId) {
        el = document.getElementById(`finding-row-${targetId}`);
      }

      // 2) Fallback: section opportunités
      if (!el) {
        el = document.getElementById(reportTargetId);
      }

      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Glow temporaire Prospek360 (subtil)
      el.classList.add("ring-2", "ring-[rgba(195,53,65,0.30)]", "transition-all");

      const t2 = window.setTimeout(() => {
        el?.classList.remove("ring-2", "ring-[rgba(195,53,65,0.30)]", "transition-all");
      }, 1400);

      return () => window.clearTimeout(t2);
    }, 220);

    return () => window.clearTimeout(t);
  }, [sp, reportTargetId]);

  return null;
}
