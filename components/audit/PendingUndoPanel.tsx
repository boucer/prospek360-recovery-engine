// components/audit/PendingUndoPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

function formatMoney(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

function formatMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type PendingItem = {
  id: string;
  title: string;
  priorityLabel: string;
  valueCents: number;
  handledAtISO: string;
  detail: string;
};

export default function PendingUndoPanel({ items }: { items: PendingItem[] }) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const computed = useMemo(() => {
    const now = Date.now();
    return items
      .map((it) => {
        const handledAtMs = new Date(it.handledAtISO).getTime();
        const expiresAt = handledAtMs + UNDO_WINDOW_MS;
        const remainingMs = Math.max(0, expiresAt - now);
        const remainingSec = Math.floor(remainingMs / 1000);
        return { ...it, expiresAt, remainingSec };
      })
      .filter((x) => x.remainingSec > 0)
      .sort((a, b) => b.expiresAt - a.expiresAt);
  }, [items, tick]);

  async function undo(id: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/recovery-findings/${id}/unhandle`, {
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
          detail: { message: "❌ Impossible d’annuler (Undo)", ms: 2200 },
        })
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#c33541]/30 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">En attente (Undo)</h3>
          <p className="text-xs text-slate-300/70">
            Actions traitées récemment — tu peux annuler pendant ~5 minutes.
          </p>
        </div>
        <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
          {computed.length}
        </span>
      </div>

      {computed.length === 0 ? (
        <div className="mt-3 text-sm text-slate-300/60">
          Aucune action en attente.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {computed.slice(0, 8).map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {o.title}
                    </span>
                    <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                      {o.priorityLabel}
                    </span>

                    {o.valueCents > 0 && (
                      <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                        {formatMoney(o.valueCents)}
                      </span>
                    )}

                    <span className="text-[11px] rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-200 font-semibold">
                      ⏳ {formatMMSS(o.remainingSec)}
                    </span>

                    <span className="text-[11px] text-slate-300/60">
                      {new Date(o.handledAtISO).toLocaleString("fr-CA")}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-slate-300/70 line-clamp-2">
                    {o.detail}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => undo(o.id)}
                  disabled={busyId === o.id}
                  className={[
                    "shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                    busyId === o.id
                      ? "border-white/10 bg-slate-900/40 text-slate-200/60 cursor-not-allowed"
                      : "border-red-500/35 bg-red-500/12 text-slate-100 hover:bg-red-500/18",
                  ].join(" ")}
                >
                  ↩ Annuler
                </button>
              </div>
            </div>
          ))}

          {computed.length > 8 && (
            <div className="text-xs text-slate-300/60">
              +{computed.length - 8} autre(s) en attente…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
