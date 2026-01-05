"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextBestActionHero from "@/components/audit/NextBestActionHero";
import StickyNextActionBar from "@/components/audit/StickyNextActionBar";
import type { Opportunity } from "@/lib/audit/types";

const WOW_OUT_MS = 220;
const SPARK_MS = 420;

const LAST_ACTION_STORAGE_KEY = "recovery:lastActionAt";
const LAST_ACTION_SUMMARY_KEY = "recovery:lastActionSummary";
const RECENT_ACTION_TOAST_WINDOW_MS = 10_000;
const JUST_CLEARED_OPPORTUNITY_KEY = "recovery:justCleared";

const TOAST_MS_INFO = 1800;
const TOAST_MS_HANDLED = 2200;
const TOAST_MS_ERROR = 2000;
const TOAST_MS_PROGRESS = 2000;
const TOAST_MS_CLEARED = 2200;

function emitToast(message: string, ms = TOAST_MS_INFO) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("recovery:toast", { detail: { message, ms } }));
}

export default function NextBestActionClient({
  opportunity,
  ageDays,
  prevHref,
  nextHref,
  urgentHref,
  noreplyHref,
  allHref,
}: {
  opportunity: Opportunity | null;

  prevHref?: string;
  nextHref?: string;
  urgentHref?: string;
  noreplyHref?: string;
  allHref?: string;

  ageDays?: number;
})
 {
  const router = useRouter();

  const resolvedPrevHref = prevHref ?? "/audit?autoSelect=prev";
const resolvedNextHref = nextHref ?? "/audit?autoSelect=next";
const resolvedUrgentHref =
  urgentHref ?? "/audit?focus=priority&autoSelect=top";
const resolvedNoreplyHref =
  noreplyHref ?? "/audit?focus=noreply&autoSelect=top";
const resolvedAllHref = allHref ?? "/audit?autoSelect=top";


  const [busy, setBusy] = useState(false);
  const [wow, setWow] = useState<"idle" | "successFlash" | "exit">("idle");
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);

  const prevHadOpportunityRef = useRef<boolean>(Boolean(opportunity));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ACTION_STORAGE_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setLastActionAt(n);
    } catch {}

    try {
      const s = localStorage.getItem(LAST_ACTION_SUMMARY_KEY);
      if (s) setLastActionSummary(s);
    } catch {}
  }, []);

  const setLastActionNow = (summary?: string) => {
    const ts = Date.now();
    setLastActionAt(ts);
    try {
      localStorage.setItem(LAST_ACTION_STORAGE_KEY, String(ts));
    } catch {}

    if (summary) {
      setLastActionSummary(summary);
      try {
        localStorage.setItem(LAST_ACTION_SUMMARY_KEY, summary);
      } catch {}
    }
  };

  // ✅ Quand la prochaine opportunity devient null: on garde le Hero en empty-state + message court
  useEffect(() => {
    const prevHad = prevHadOpportunityRef.current;
    const nowHas = Boolean(opportunity);

    if (prevHad && !nowHas) {
      let justCleared = false;
      try {
        justCleared = localStorage.getItem(JUST_CLEARED_OPPORTUNITY_KEY) === "1";
        if (justCleared) localStorage.removeItem(JUST_CLEARED_OPPORTUNITY_KEY);
      } catch {}

      if (justCleared) {
        emitToast("🎯 Traité. Tu es à jour.", TOAST_MS_CLEARED);
      } else {
        const ts = lastActionAt ?? 0;
        const isRecent = ts > 0 && Date.now() - ts <= RECENT_ACTION_TOAST_WINDOW_MS;
        if (isRecent) emitToast("✅ Traité. Tu es à jour.", TOAST_MS_CLEARED);
      }
    }

    // IMPORTANT: si plus d'opportunity, on reset wow -> idle (sinon opacity 0)
    if (!nowHas) setWow("idle");

    prevHadOpportunityRef.current = nowHas;
  }, [opportunity, lastActionAt]);

  const scrollToHistory = () => {
    const el = document.getElementById("historique");
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }
    window.location.hash = "historique";
  };

  async function runAuditNow() {
    if (busy) return;
    setBusy(true);

    try {
      emitToast("🔁 Relance de l’audit…", TOAST_MS_PROGRESS);
      const res = await fetch("/api/audit/run", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      emitToast("✅ Audit relancé.", TOAST_MS_PROGRESS);
      router.refresh();
    } catch {
      emitToast("❌ Impossible de relancer l’audit.", TOAST_MS_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage(opp: Opportunity) {
    if (busy) return;
    setBusy(true);

    try {
      const o: any = opp as any;
      const msg =
        (o.message as string | undefined) ||
        (o.suggestedMessage as string | undefined) ||
        (o.copyText as string | undefined);

      if (!msg) {
        emitToast("ℹ️ Aucun message à copier.", TOAST_MS_INFO);
        return;
      }

      await navigator.clipboard.writeText(msg);
      emitToast("📋 Message copié.", TOAST_MS_INFO);
    } catch {
      emitToast("❌ Copie impossible.", TOAST_MS_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function markHandled(opp: Opportunity) {
    if (busy) return;
    setBusy(true);

    try {
      const o: any = opp as any;
      const id = (o.id ?? o.findingId ?? o.recoveryFindingId) as string | undefined;
      if (!id) throw new Error("missing id");

      setWow("successFlash");

      const res = await fetch(`/api/recovery-findings/${id}/handle`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();

      // ✅ message court qui restera visible dans le Hero "empty-state"
      setLastActionNow("✅ Dernière action : marqué comme traité.");

      try {
        localStorage.setItem(JUST_CLEARED_OPPORTUNITY_KEY, "1");
      } catch {}

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

  // ✅ Toujours visible (même si opportunity null) — le Hero affiche alors l’empty-state
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
          lastActionSummary={lastActionSummary}
        />
      </div>

      <StickyNextActionBar show={Boolean(opportunity)} targetId="nba-card" />
    </>
  );
}
