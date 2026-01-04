"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AutopilotQueueItem = {
  id: string;
  type: string;
  severity: number;
  title: string;
  description: string;
  action: string;
  valueCents: number;
  createdAt: string | Date;
  autopilotQueuedAt: string | Date | null;
};

function dollars(cents: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function hoursAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const h = diff / (1000 * 60 * 60);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${Math.round(h * 10) / 10} h`;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
      {children}
    </span>
  );
}

type ApiExecuteRes = { ok: boolean; handled: number; totalValueCents: number; ids: string[]; message?: string };
type ApiUndoRes = { ok: boolean; restored: number; ids: string[]; message?: string };
type ApiDequeueRes = { ok: boolean; updated: number; ids: string[]; message?: string };

export default function AutopilotQueueClient({ initialItems }: { initialItems: AutopilotQueueItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Undo (simple et premium) : on garde la dernière exécution
  const [lastExec, setLastExec] = useState<{ ids: string[]; at: number } | null>(null);

  const items = useMemo(() => {
    return (initialItems ?? []).map((x) => ({
      ...x,
      createdAt: new Date(x.createdAt),
      autopilotQueuedAt: x.autopilotQueuedAt ? new Date(x.autopilotQueuedAt) : null,
    }));
  }, [initialItems]);

  async function executeIds(ids: string[]) {
    if (!ids.length) return;

    try {
      setLoading("EXECUTE");
      setToast(null);

      const res = await fetch("/api/recovery/autopilot-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as ApiExecuteRes;

      if (!data.ok) {
        setToast(data.message ?? "Erreur exécution Auto-Pilot.");
        return;
      }

      setToast(`✅ ${data.handled} exécuté(s) — ${dollars(data.totalValueCents)}`);
      setLastExec({ ids: data.ids, at: Date.now() });

      router.refresh();
    } catch (e) {
      console.error(e);
      setToast("Erreur exécution Auto-Pilot. Regarde console/terminal.");
    } finally {
      setLoading(null);
    }
  }

  async function executeAll() {
    if (!items.length) return;
    await executeIds(items.map((x) => x.id));
  }

  async function undoLast() {
    if (!lastExec?.ids?.length) return;

    // UX: on autorise l’undo pendant ~15s (client-side)
    const age = Date.now() - lastExec.at;
    if (age > 15000) {
      setToast("Undo expiré (15s).");
      setLastExec(null);
      return;
    }

    try {
      setLoading("UNDO");
      setToast(null);

      const res = await fetch("/api/recovery/autopilot-undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: lastExec.ids }),
      });
      const data = (await res.json()) as ApiUndoRes;

      if (!data.ok) {
        setToast(data.message ?? "Erreur Undo.");
        return;
      }

      setToast(`↩️ Undo: ${data.restored} restauré(s) dans la file`);
      setLastExec(null);
      router.refresh();
    } catch (e) {
      console.error(e);
      setToast("Erreur Undo. Regarde console/terminal.");
    } finally {
      setLoading(null);
    }
  }

  async function dequeueIds(ids: string[]) {
    if (!ids.length) return;

    try {
      setLoading("DEQUEUE");
      setToast(null);

      const res = await fetch("/api/recovery/autopilot-dequeue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as ApiDequeueRes;

      if (!data.ok) {
        setToast(data.message ?? "Erreur retrait de la file.");
        return;
      }

      setToast(`🧹 Retiré(s) de la file: ${data.updated}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setToast("Erreur retrait. Regarde console/terminal.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top actions */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Contrôle</div>
          <div className="text-sm text-white/60">
            Exécute en batch pour momentum, puis “Undo” si tu t’es trompé.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.refresh()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            ↻ Rafraîchir
          </button>

          <button
            onClick={executeAll}
            disabled={!items.length || loading !== null}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {loading === "EXECUTE" ? "Exécution..." : "🔥 Exécuter tout"}
          </button>

          <button
            onClick={undoLast}
            disabled={!lastExec?.ids?.length || loading !== null}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {loading === "UNDO" ? "Undo..." : "↩️ Undo"}
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-white/70">{toast}</div>
      ) : null}

      {/* List */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Items en file</div>
          <div className="text-xs text-white/50">{items.length} items</div>
        </div>

        <div className="mt-3 space-y-2">
          {items.length ? (
            items.map((x) => (
              <div
                key={x.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{x.type}</Badge>
                    <Badge>Severity {x.severity}</Badge>
                    <Badge>{dollars(x.valueCents ?? 0)}</Badge>
                    <span className="text-xs text-white/40">
                      créé {hoursAgo(x.createdAt as Date)} • queue{" "}
                      {x.autopilotQueuedAt ? hoursAgo(x.autopilotQueuedAt as Date) : "—"}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-semibold text-white truncate">{x.title}</div>
                  <div className="mt-1 text-sm text-white/60 line-clamp-2">{x.description}</div>

                  <div className="mt-2 text-xs text-white/50">
                    <span className="font-semibold text-white/70">Action:</span> {x.action}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    onClick={() => executeIds([x.id])}
                    disabled={loading !== null}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    ✅ Exécuter
                  </button>

                  <button
                    onClick={() => dequeueIds([x.id])}
                    disabled={loading !== null}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    🧹 Retirer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-white/70">
              Aucun item en file. Retourne sur <span className="font-semibold text-white/80">/recovery</span> et clique
              “Lancer Auto-Pilot”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
