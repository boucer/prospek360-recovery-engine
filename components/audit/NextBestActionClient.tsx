"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextBestActionHero from "@/components/audit/NextBestActionHero";
import StickyNextActionBar from "@/components/audit/StickyNextActionBar";
import type { Opportunity } from "@/lib/audit/types";

const WOW_OUT_MS = 220;
const SPARK_MS = 420;

const LAST_ACTION_STORAGE_KEY = "recovery:lastActionAt";
const RECENT_ACTION_TOAST_WINDOW_MS = 10_000;
const JUST_CLEARED_OPPORTUNITY_KEY = "recovery:justCleared";

const TOAST_MS_INFO = 1800;
const TOAST_MS_COPY = 2000;
const TOAST_MS_PROGRESS = 1600;
const TOAST_MS_ERROR = 2600;
const TOAST_MS_HANDLED = 3200;
const TOAST_MS_CLEARED = 3800;

function getOpportunityId(opp: any): string | null {
  const id =
    opp?.id ??
    opp?.findingId ??
    opp?.recoveryFindingId ??
    opp?.recoveryId ??
    opp?.opportunityId;

  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

export default function NextBestActionClient({
  opportunity,
  ageDays, // ✅ AJOUTÉ (optionnel)
  prevHref,
  nextHref,
  urgentHref,
  noreplyHref,
  allHref,
}: {
  opportunity: Opportunity | null;
  ageDays?: number; // ✅ AJOUTÉ (optionnel, safe)
  prevHref: string;
  nextHref: string;
  urgentHref: string;
  noreplyHref: string;
  allHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [wow, setWow] = useState<"idle" | "successFlash" | "exit">("idle");
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);

  const initialPrevHad =
    typeof window !== "undefined" &&
    (() => {
      try {
        return localStorage.getItem(JUST_CLEARED_OPPORTUNITY_KEY) === "1";
      } catch {
        return false;
      }
    })()
      ? true
      : Boolean(opportunity);

  const prevHadOpportunityRef = useRef<boolean>(initialPrevHad);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ACTION_STORAGE_KEY);
      if (!raw) return;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setLastActionAt(n);
    } catch {}
  }, []);

  const setLastActionNow = () => {
    const ts = Date.now();
    setLastActionAt(ts);
    try {
      localStorage.setItem(LAST_ACTION_STORAGE_KEY, String(ts));
    } catch {}
  };

  const emitToast = (message: string, ms = TOAST_MS_INFO) => {
    window.dispatchEvent(
      new CustomEvent("recovery:toast", { detail: { message, ms } })
    );
  };

  useEffect(() => {
    const prevHad = prevHadOpportunityRef.current;
    const nowHas = Boolean(opportunity);

    if (prevHad && !nowHas) {
      let justCleared = false;
      try {
        justCleared =
          localStorage.getItem(JUST_CLEARED_OPPORTUNITY_KEY) === "1";
        if (justCleared) localStorage.removeItem(JUST_CLEARED_OPPORTUNITY_KEY);
      } catch {}

      if (justCleared) {
        emitToast("🎯 Tu es à jour. Rien d’urgent.", TOAST_MS_CLEARED);
      } else {
        const ts = lastActionAt ?? 0;
        const isRecent =
          ts > 0 && Date.now() - ts <= RECENT_ACTION_TOAST_WINDOW_MS;

        if (isRecent) {
          emitToast("🎯 Tu es à jour. Rien d’urgent.", TOAST_MS_CLEARED);
        }
      }
    }

    prevHadOpportunityRef.current = nowHas;
  }, [opportunity, lastActionAt]);

  const scrollToHistory = () => {
    const el = document.getElementById("historique");
    if (!el) {
      window.location.hash = "historique";
      return;
    }

    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}

    window.location.hash = "historique";
  };

  async function runAuditNow() {
    if (busy) return;
    setBusy(true);

    try {
      emitToast("🔁 Relance de l’audit en cours…", TOAST_MS_PROGRESS);
      const res = await fetch("/api/audit/run", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      emitToast("✅ Audit relancé. Mise à jour…", TOAST_MS_PROGRESS);
      router.refresh();
    } catch {
      emitToast("❌ Impossible de relancer l’audit.", TOAST_MS_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage(opp: Opportunity) {
    try {
      const text =
        (opp as any)?.recommendedMessage ?? (opp as any)?.detail ?? "";
      await navigator.clipboard.writeText(String(text));
      emitToast("📋 Message copié ✅", TOAST_MS_COPY);
    } catch {
      emitToast("❌ Impossible de copier le message.", TOAST_MS_ERROR);
    }
  }

  async function markHandled(opp: Opportunity) {
    if (busy) return;
    const id = getOpportunityId(opp);
    if (!id) {
      emitToast("❌ ID introuvable.", TOAST_MS_ERROR);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/recovery-findings/${id}/handle`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();

      setLastActionNow();
      try {
        localStorage.setItem(JUST_CLEARED_OPPORTUNITY_KEY, "1");
      } catch {}

      setWow("successFlash");
      setTimeout(() => setWow("exit"), SPARK_MS);
      setTimeout(() => setWow("idle"), SPARK_MS + WOW_OUT_MS);

      emitToast("✅ Marqué comme traité — Annuler dispo 5 min.", TOAST_MS_HANDLED);
      router.refresh();
    } catch {
      emitToast("❌ Impossible de marquer traité.", TOAST_MS_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const wowClass =
    wow === "idle"
      ? "opacity-100 translate-y-0"
      : wow === "successFlash"
      ? "opacity-100 translate-y-0 shadow-[0_0_0_4px_rgba(195,53,65,0.12),0_0_40px_rgba(195,53,65,0.10)]"
      : "opacity-0 translate-y-2";

  return (
    <>
      <div className={wowClass}>
        <NextBestActionHero
          opportunity={opportunity}
          onCopy={copyMessage}
          onMarkTreated={markHandled}
          onRunAudit={runAuditNow}
          onViewHistory={scrollToHistory}
          isBusy={busy}
          lastActionAt={lastActionAt}
        />
      </div>

      <StickyNextActionBar show={Boolean(opportunity)} targetId="nba-card" />
    </>
  );
}
