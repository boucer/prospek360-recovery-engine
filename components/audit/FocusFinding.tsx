"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function FocusFinding() {
  const sp = useSearchParams();
  const focus = sp.get("focus");

  useEffect(() => {
    if (!focus) return;

    const el =
      document.querySelector(`[data-finding-id="${focus}"]`) ||
      document.getElementById(`finding-${focus}`);

    if (!el) return;

    // Scroll + focus
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Highlight temporaire (WOW sans être gossant)
    el.classList.add("ring-2", "ring-red-500/60");
    el.classList.add("bg-red-500/5");

    const t = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-red-500/60", "bg-red-500/5");
    }, 1800);

    return () => window.clearTimeout(t);
  }, [focus]);

  return null;
}
