"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
  id: string;
  type: string;
  severity: number;
  title: string;
  description?: string;
  action?: string;
  valueCents?: number;
};

type AutoPilotPhase = "idle" | "analyzing" | "deciding" | "executing" | "done";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getReason(item: Item) {
  // 1 seule raison, toujours.
  if (item.severity >= 8) return "Impact estimé élevé";
  if (item.valueCents && item.valueCents >= 5000) return "Opportunité sensible au temps";
  return "Action prioritaire détectée";
}

export default function AutopilotClient() {
  const [queue, setQueue] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<AutoPilotPhase>("idle");
  const [totalRecovered, setTotalRecovered] = useState(0);

  const current = queue[index] ?? null;
  const total = queue.length;
  const remaining = Math.max(total - index, 0);

  const progress = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  /* -----------------------------
     API helpers
  ----------------------------- */

  async function fetchQueue() {
    setPhase("analyzing");
    const res = await fetch("/api/recovery/autopilot-queue");
    const data = await res.json();
    setQueue(data.items ?? []);
    setIndex(0);
    setTotalRecovered(0);

    await sleep(350); // micro-latence = perception d’analyse
    setPhase((data.items ?? []).length > 0 ? "deciding" : "idle");
  }

  async function generateQueue() {
    setLoading(true);
    setPhase("analyzing");
    await fetch("/api/recovery/autopilot", { method: "POST" });
    await fetchQueue();
    setLoading(false);
  }

  async function markHandled() {
    if (!current) return;
    setLoading(true);
    setPhase("executing");

    await sleep(450); // micro-latence = perception d’exécution

    await fetch("/api/recovery/autopilot-execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [current.id] }),
    });

    setTotalRecovered((v) => v + (current.valueCents ?? 0));
    setIndex((i) => i + 1);
    setLoading(false);

    // Si on vient de traiter le dernier item
    const nextIndex = index + 1;
    if (nextIndex >= total) {
      setPhase("done");
    } else {
      await sleep(250);
      setPhase("deciding");
    }
  }

  async function undo() {
    if (index === 0) return;
    const prev = queue[index - 1];
    if (!prev) return;

    setLoading(true);
    setPhase("executing");

    await sleep(300);

    await fetch("/api/recovery/autopilot-undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: prev.id }),
    });

    setTotalRecovered((v) => v - (prev.valueCents ?? 0));
    setIndex((i) => Math.max(i - 1, 0));
    setLoading(false);

    await sleep(200);
    setPhase("deciding");
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase("deciding");
  }

  /* -----------------------------
     UI helpers (V1.2)
  ----------------------------- */

  const phaseLabel =
    phase === "analyzing"
      ? "Analyse du contexte…"
      : phase === "deciding"
      ? "Action prioritaire identifiée"
      : phase === "executing"
      ? "Exécution de l’action…"
      : phase === "done"
      ? "Auto-Pilot terminé"
      : "";

  return (
    <div className="space-y-6">
      {/* V1.2 — “Perception d’intelligence” (état cognitif discret) */}
      {(phase !== "idle" && phase !== "done") && (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">{phaseLabel}</span>
            {current && phase === "deciding" && (
              <span className="text-xs text-white/50">{getReason(current)}</span>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex justify-between text-sm text-white/70 mb-2">
          <span>Progression</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-white/50">
          Restant : {remaining}/{total}
          {totalRecovered > 0 && (
            <span className="ml-2 text-emerald-400">
              +{(totalRecovered / 100).toFixed(2)} $
            </span>
          )}
        </div>
      </div>

      {/* No queue */}
      {total === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center">
          <p className="text-white/60 mb-4">Aucune file générée.</p>
          <button
            onClick={generateQueue}
            disabled={loading}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            ⚡ Générer la file Auto-Pilot
          </button>
        </div>
      )}

      {/* Current item */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-white/10 bg-slate-950/70 p-6"
          >
            <div className="flex justify-between items-start mb-3">
              {/* V1.2 — Badge “Choix Auto-Pilot” */}
              <span className="text-xs px-2 py-1 rounded bg-white/10">
                🧠 Choix Auto-Pilot · {current.type}
              </span>
              <span className="text-xs text-white/60">Sévérité {current.severity}</span>
            </div>

            <h2 className="text-xl font-semibold text-white mb-1">{current.title}</h2>

            {/* V1.2 — Raison unique */}
            <p className="text-sm text-white/50 mb-3">{getReason(current)}</p>

            {current.valueCents && (
              <p className="text-sm text-white/60 mb-4">
                Valeur estimée : {(current.valueCents / 100).toFixed(2)} $
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={markHandled}
                disabled={loading}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                ✓ Marquer traité
              </button>

              <button
                onClick={next}
                disabled={loading}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white"
              >
                ⏭ Suivant
              </button>

              {/* ✅ Undo conservé */}
              <button
                onClick={undo}
                disabled={loading || index === 0}
                className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 text-white/70"
              >
                ↩ Undo
              </button>
            </div>

            <p className="mt-4 text-xs text-white/40">
              Continue. Chaque action récupère de la valeur.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End */}
      {total > 0 && remaining === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center">
          <p className="text-white">
            🎉 <strong>File terminée</strong>
          </p>
          <p className="text-sm text-white/60 mt-1">
  Résumé Auto-Pilot : {total} analysées ·{" "}
  {totalRecovered > 0
    ? "Actions exécutées avec impact"
    : "Aucune action exécutée (validation manuelle requise)."}
</p>

        </div>
      )}
    </div>
  );
}
