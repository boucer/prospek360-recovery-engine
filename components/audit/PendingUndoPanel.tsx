"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const UNDO_WINDOW_MS = 5 * 60 * 1000;

// ✅ Mets ton endpoint EXISTANT en premier.
// (On met des fallbacks pour ne plus jamais casser l'écran si un path change.)
const LIST_ENDPOINTS = [
  "/api/recovery/pending-undo",
  "/api/audit/pending-undo",
  "/api/recovery/undo-pending",
  "/api/audit/undo-pending",
];

const UNDO_ENDPOINTS = [
  "/api/recovery/undo-action",
  "/api/audit/undo-action",
  "/api/recovery/undo",
  "/api/audit/undo",
];

type UndoItem = {
  id: string; // findingId ou id
  findingId?: string;

  title?: string;
  type?: string;
  description?: string;
  severity?: number;
  valueCents?: number;

  handledAtISO?: string; // ✅ notre format
  handledAt?: string; // fallback
  treatedAtISO?: string; // fallback
};

async function fetchFirstOk<T>(urls: string[]): Promise<T | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // ignore
    }
  }
  return null;
}

async function postFirstOk<T>(
  urls: string[],
  body: any
): Promise<T | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // ignore
    }
  }
  return null;
}

export default function PendingUndoPanel() {
  const router = useRouter();
  const [items, setItems] = useState<UndoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);

  // tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // fetch list
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await fetchFirstOk<{ items?: UndoItem[] }>(LIST_ENDPOINTS);
      if (cancelled) return;

      const arr = Array.isArray(data?.items) ? data!.items! : [];
      setItems(arr);
      setLoading(false);
    }

    load();
    const t = setInterval(load, 12_000); // refresh doux
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const visible = useMemo(() => {
    const normalized = (items ?? []).map((it) => {
      const handledISO =
        it.handledAtISO || it.handledAt || it.treatedAtISO || "";
      const handledMs = handledISO ? new Date(handledISO).getTime() : 0;
      const expiresAt = handledMs ? handledMs + UNDO_WINDOW_MS : 0;
      const remainingMs = Math.max(0, expiresAt - now);

      return {
        ...it,
        _handledMs: handledMs,
        _remainingMs: remainingMs,
      };
    });

    // garde seulement ceux encore annulables
    return normalized
      .filter((it: any) => it._handledMs && it._remainingMs > 0)
      .sort((a: any, b: any) => b._handledMs - a._handledMs);
  }, [items, now]);

  async function onUndo(item: UndoItem) {
    const findingId = item.findingId || item.id;
    if (!findingId) return;

    setBusyId(findingId);

    const res = await postFirstOk<{ ok?: boolean }>(UNDO_ENDPOINTS, {
      findingId,
    });

    setBusyId(null);

    // optimistic remove
    setItems((prev) => prev.filter((x) => (x.findingId || x.id) !== findingId));

    // refresh server comps
    router.refresh();

    // si endpoint non trouvé, au moins on ne casse pas l'UI
    if (!res?.ok) {
      // no-op
    }
  }

  if (loading && visible.length === 0) return null;
  if (!loading && visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-950/10">
      <div className="flex items-center justify-between border-b border-emerald-400/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-200">
            🕒 En attente
          </span>
          <span className="text-xs text-emerald-200/70">(Annulable 5 min)</span>
        </div>
        <div className="text-xs text-emerald-200/60">
          {visible.length} élément(s)
        </div>
      </div>

      <div className="p-4 space-y-3">
        {visible.map((it: any) => {
          const findingId = it.findingId || it.id;
          const remainingSec = Math.ceil(it._remainingMs / 1000);
          const mm = String(Math.floor(remainingSec / 60)).padStart(1, "0");
          const ss = String(remainingSec % 60).padStart(2, "0");

          return (
            <div
              key={findingId}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    {it.title || "Activité traitée"}
                  </div>
                  {it.description ? (
                    <div className="mt-1 text-xs text-slate-300/80 line-clamp-2">
                      {it.description}
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                      ⏳ {mm}:{ss}
                    </span>
                    {typeof it.valueCents === "number" ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                        💰 {(it.valueCents / 100).toFixed(0)} $
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => onUndo(it)}
                  disabled={busyId === findingId}
                  className="shrink-0 rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {busyId === findingId ? "..." : "Annuler"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
