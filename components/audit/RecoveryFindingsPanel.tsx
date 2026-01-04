// components/audit/RecoveryFindingsPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecoveryFinding } from "@prisma/client";
import RecoveryFindingsTable from "@/components/audit/RecoveryFindingsTable";

function formatCAD(cents: number) {
  const v = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(v);
}

/* =========================
   Toast bottom-right (WOW)
========================= */
function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="text-sm font-semibold text-slate-100 whitespace-pre-line">
        {message}
      </div>
      <div className="mt-1 text-[11px] text-slate-300/70">
        Recovery Engine • WOW
      </div>
    </div>
  );
}

type SortOption = "severity_desc" | "severity_asc" | "newest" | "oldest";

export default function RecoveryFindingsPanel({
  findings,
  highlightFindingId,
  highlightType,
}: {
  findings: RecoveryFinding[];
  highlightFindingId?: string | null;
  highlightType?: string | null;
}) {
  const router = useRouter();

  // UI state
  const [onlyUnhandled] = useState(true);
  const [sort] = useState<SortOption>("severity_desc");
  const [typeFilter] = useState<string>("ALL");

  /* =========================
     Toast state
  ========================= */
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  function showToast(msg: string, ms = 2000) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, ms);
  }

  /* =========================
     🔔 GLOBAL EVENT LISTENERS
  ========================= */

  useEffect(() => {
    const onCopied = (e: any) => {
      const msg = e?.detail?.message ?? "📋 Message copié ✅";
      showToast(msg, 1400);
    };
    window.addEventListener("recovery:copied" as any, onCopied);
    return () => window.removeEventListener("recovery:copied" as any, onCopied);
  }, []);

  useEffect(() => {
    const onToast = (e: any) => {
      const msg = e?.detail?.message;
      const ms = e?.detail?.ms ?? 1800;
      if (!msg) return;
      showToast(msg, ms);
    };
    window.addEventListener("recovery:toast" as any, onToast);
    return () => window.removeEventListener("recovery:toast" as any, onToast);
  }, []);

  async function markAsHandled(finding: RecoveryFinding) {
    try {
      const res = await fetch(`/api/recovery-findings/${finding.id}/handle`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("handle_failed");

      showToast(`✅ Traité — ${formatCAD((finding as any).valueCents ?? 0)} récupérés`, 2000);
      router.refresh();
    } catch {
      showToast("❌ Impossible de marquer comme traité", 2200);
    }
  }

  /* =========================
     Filtering / sorting
  ========================= */
  const processed = useMemo(() => {
    let list = findings.slice();

    if (typeFilter !== "ALL") {
      list = list.filter((f) => (f as any).type === typeFilter);
    }

    if (onlyUnhandled) {
      list = list.filter((f) => !(f as any).handled);
    }

    list.sort((a: any, b: any) => {
      if (sort === "severity_desc") return (b.severity ?? 0) - (a.severity ?? 0);
      if (sort === "severity_asc") return (a.severity ?? 0) - (b.severity ?? 0);
      if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
      return +new Date(a.createdAt) - +new Date(b.createdAt);
    });

    return list;
  }, [findings, onlyUnhandled, sort, typeFilter]);

  return (
    <div className="space-y-3">
      <Toast message={toast} />

      <RecoveryFindingsTable
        findings={processed}
        highlightFindingId={highlightFindingId}
        highlightType={highlightType}
        onMarkAsHandled={markAsHandled}
      />
    </div>
  );
}
