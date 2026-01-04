// components/audit/PendingUndoList.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

function formatMoney(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function formatMMSS(totalSec: number) {
  const s = Math.max(0, totalSec | 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

type Item = {
  findingId: string;
  treated?: boolean;
  handledAt?: string | Date | null;
  createdAt?: string | Date | null;
  typeLabel?: string;
  priorityLabel?: string;
  valueCents?: number;
  detail?: string;
};

export default function PendingUndoList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // ⏱ tick 1s pour countdown live
  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const now = Date.now();

  const pending = useMemo(() => {
    const treated = (items ?? []).filter((o) => o.treated);
    const mapped = treated
      .map((o) => {
        const t = new Date((o.handledAt ?? o.createdAt) as any).getTime();
        const remainingSec = Math.floor(
          Math.max(0, t + UNDO_WINDOW_MS - now) / 1000
        );
        return { ...o, remainingSec };
      })
      .filter((o: any) => o.remainingSec > 0)
      .sort((a: any, b: any) => a.remainingSec - b.remainingSec);

    return mapped;
  }, [items, now, tick]);

  async function undo(findingId: string) {
    try {
      const res = await fetch(`/api/recovery-findings/${findingId}/unhandle`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error("undo_failed");

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

  const visible = expanded ? pending : pending.slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            En attente (Undo)
          </h3>
          <p className="text-xs text-slate-300/70">
            Actions traitées récemment — tu peux annuler pendant ~5 minutes.
          </p>
        </div>
        <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
          {pending.length}
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="mt-3 text-sm text-slate-300/60">
          Aucune action en attente.
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {visible.map((o: any) => (
              <div
                key={o.findingId}
                className="rounded-xl border border-red-500/20 bg-slate-950/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {o.typeLabel ?? "Action"}
                      </span>

                      {o.priorityLabel ? (
                        <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                          {o.priorityLabel}
                        </span>
                      ) : null}

                      {(o.valueCents ?? 0) > 0 ? (
                        <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                          {formatMoney(o.valueCents)}
                        </span>
                      ) : null}

                      <span className="text-[11px] rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-red-200">
                        ⏳ {formatMMSS(o.remainingSec)}
                      </span>

                      <span className="text-[11px] text-slate-300/60">
                        {new Date(o.handledAt ?? o.createdAt).toLocaleString(
                          "fr-CA"
                        )}
                      </span>
                    </div>

                    {o.detail ? (
                      <div className="mt-1 text-xs text-slate-300/70 line-clamp-2">
                        {o.detail}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => undo(o.findingId)}
                    className="shrink-0 inline-flex items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 transition"
                  >
                    ↩ Annuler
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pending.length > 6 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-xs text-slate-300/70 hover:text-slate-200"
            >
              {expanded ? "Réduire" : `Voir tout (${pending.length})`}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
