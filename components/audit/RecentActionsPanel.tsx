"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

type RecentAction = {
  id: string;
  title: string;
  type: string;
  valueCents: number;
  handledAt: Date;
};

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("fr-CA", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatMMSS(totalSec: number) {
  const s = Math.max(0, totalSec | 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function RecentActionsPanel({
  actions,
  historyRange,
}: {
  actions: RecentAction[];
  historyRange: "today" | "7d" | "30d";
}) {
  const router = useRouter();
  const [tick, setTick] = useState(0);

  // ⏱ refresh countdown
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const now = Date.now();

  /** =========================
   *  UNDO = actions récentes < 5 min
   *  ========================= */
  const pendingUndo = useMemo(() => {
    return actions
      .map((a) => {
        const handledAtMs = new Date(a.handledAt).getTime();
        const remainingSec = Math.floor(
          Math.max(0, handledAtMs + UNDO_WINDOW_MS - now) / 1000
        );
        return { ...a, remainingSec };
      })
      .filter((a) => a.remainingSec > 0);
  }, [actions, now, tick]);

  const confirmed = useMemo(() => {
    return actions.filter((a) => {
      const handledAtMs = new Date(a.handledAt).getTime();
      return handledAtMs + UNDO_WINDOW_MS <= now;
    });
  }, [actions, now]);

  async function undo(id: string) {
    try {
      const res = await fetch(`/api/recovery-findings/${id}/unhandle`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();

      window.dispatchEvent(
        new CustomEvent("recovery:toast", {
          detail: { message: "↩ Annulé — remis en priorité", ms: 1800 },
        })
      );

      router.refresh();
    } catch {
      window.dispatchEvent(
        new CustomEvent("recovery:toast", {
          detail: { message: "❌ Impossible d’annuler", ms: 2200 },
        })
      );
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {/* =========================
          EN ATTENTE (UNDO)
         ========================= */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-slate-100">
          En attente (Undo)
        </h3>
        <p className="text-xs text-slate-300/70">
          Actions traitées récemment — annulables pendant ~5 minutes.
        </p>

        {pendingUndo.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300/70">
            Rien en attente. ✅
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {pendingUndo.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/15 bg-slate-950/50 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                      {formatCADCompact(a.valueCents)} récupéré
                    </span>
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">
                      ⏳ {formatMMSS(a.remainingSec)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-950/60 px-2 py-0.5 text-[11px] font-semibold text-slate-200/90">
                      {a.type}
                    </span>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {a.title}
                  </div>
                </div>

                <button
                  onClick={() => undo(a.id)}
                  className="inline-flex items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                >
                  ↩ Annuler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =========================
          CONFIRMÉ
         ========================= */}
      <div>
        <h3 className="text-base font-semibold text-slate-100">
          Activité récente (confirmée)
        </h3>
        <p className="text-xs text-slate-300/70">
          Actions dont la fenêtre Undo est passée.
        </p>

        {confirmed.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300/80">
            Aucune action confirmée.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {confirmed.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        ✅ Traité
                      </span>
                      <span className="text-[11px] text-slate-300/70">
                        {formatWhen(a.handledAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-100">
                      {a.title}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-300/70">Valeur</div>
                    <div className="text-sm font-bold text-slate-100">
                      {formatCADCompact(a.valueCents)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
