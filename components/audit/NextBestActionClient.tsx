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
const LAST_ACTION_META_KEY = "recovery:lastActionMeta";
const RECENT_ACTION_TOAST_WINDOW_MS = 10_000;
const JUST_CLEARED_OPPORTUNITY_KEY = "recovery:justCleared";

const TOAST_MS_INFO = 1800;
const TOAST_MS_HANDLED = 2200;
const TOAST_MS_ERROR = 2000;
const TOAST_MS_PROGRESS = 2000;
const TOAST_MS_CLEARED = 2200;

type LastActionMeta = {
  summary: string;
  nextLabel?: string;
  nextHref?: string;
  nextHint?: string;
};

function emitToast(message: string, ms = TOAST_MS_INFO) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("recovery:toast", { detail: { message, ms } }));
}

function buildFallbackMessage(opp: Opportunity): string {
  const o: any = opp as any;

  const title = String(o.title ?? "").toLowerCase();
  const desc = String(o.description ?? "").toLowerCase();
  const action = String(o.action ?? "").toLowerCase();

  if (action.includes("créneau")) {
    return `Bonjour 👋

Je fais suite à votre intérêt récent.

Je voulais simplement vérifier si vous aviez eu le temps de regarder et vous proposer deux créneaux cette semaine pour en discuter rapidement.

Dites-moi ce qui vous convient le mieux.

—`;
  }

  if (title.includes("sans suivi") || desc.includes("aucun suivi")) {
    return `Bonjour 👋

Je reviens vers vous concernant votre intérêt récent.
Je voulais m'assurer que vous aviez bien reçu les informations et voir si nous pouvions avancer ensemble.

N'hésitez pas à me dire si c'est un bon moment pour en discuter.

—`;
  }

  if (title.includes("sans réponse") || title.includes("sans reponse")) {
    return `Bonjour 👋

Je me permets une petite relance, n'ayant pas eu de retour à mon précédent message.
Est-ce toujours pertinent pour vous en ce moment ?

Merci et au plaisir,
—`;
  }

  return `Bonjour 👋

Je fais un suivi rapide concernant votre dossier.
N'hésitez pas à me dire si vous souhaitez que l'on avance ou si vous avez des questions.

Bonne journée,
—`;
}

function getCopyText(opp: Opportunity | null): string | null {
  if (!opp) return null;
  const o: any = opp as any;

  const direct =
    (o.message as string | undefined) ||
    (o.suggestedMessage as string | undefined) ||
    (o.copyText as string | undefined);

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  return buildFallbackMessage(opp);
}

export default function NextBestActionClient({
  opportunity,
}: {
  opportunity: Opportunity | null;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [wow, setWow] = useState<"idle" | "successFlash" | "exit">("idle");
  const [lastActionAt, setLastActionAt] = useState<number | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);
  const [lastActionMeta, setLastActionMeta] = useState<LastActionMeta | null>(null);

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

    try {
      const raw = localStorage.getItem(LAST_ACTION_META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LastActionMeta;
        if (parsed && typeof parsed.summary === "string") setLastActionMeta(parsed);
      }
    } catch {}
  }, []);

  const setLastActionNow = (summary?: string, meta?: LastActionMeta) => {
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

    if (meta) {
      setLastActionMeta(meta);
      try {
        localStorage.setItem(LAST_ACTION_META_KEY, JSON.stringify(meta));
      } catch {}
    }
  };

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
      const msg = getCopyText(opp) ?? "";
      await navigator.clipboard.writeText(msg);
      emitToast("📋 Message prêt à envoyer.", TOAST_MS_INFO);
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

      const opportunityId = (o.id ?? o.opportunityId ?? o.recoveryId) as string | undefined;
      const autopilotHref = opportunityId
        ? `/autopilot?opportunityId=${encodeURIComponent(opportunityId)}`
        : "/autopilot";

      setLastActionNow("✅ Action traitée — prêt à enchaîner.", {
        summary: "Action traitée. Prochaine étape : enchaîner la séquence guidée.",
        nextLabel: "⚡ Continuer (Auto-Pilot)",
        nextHref: autopilotHref,
        nextHint: "Objectif : exécuter la suite sans perdre le fil.",
      });

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

  const wowClass =
    wow === "idle"
      ? "opacity-100 translate-y-0"
      : wow === "successFlash"
      ? "opacity-100 translate-y-0 shadow-[0_0_0_4px_rgba(195,53,65,0.12),0_0_40px_rgba(195,53,65,0.10)]"
      : "opacity-0 translate-y-2";

  const isRecent =
    (lastActionAt ?? 0) > 0 && Date.now() - (lastActionAt ?? 0) <= RECENT_ACTION_TOAST_WINDOW_MS;

  const canCopy = Boolean(getCopyText(opportunity));

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
          lastActionMeta={lastActionMeta}
          showPostAction={!opportunity && isRecent}
          canCopy={canCopy}
        />
      </div>

      <StickyNextActionBar show={Boolean(opportunity)} targetId="nba-card" />
    </>
  );
}
