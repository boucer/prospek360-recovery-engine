"use client";

import { useState } from "react";
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
  if (item.severity >= 8) return "Impact estimé élevé";
  if (item.valueCents && item.valueCents >= 5000)
    return "Opportunité sensible au temps";
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
  const progress =
    total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  async function fetchQueue() {
    setPhase("analyzing");
    const res = await fetch("/api/recovery/autopilot-queue");
    const data = await res.json();
    setQueue(data.items ?? []);
    setIndex(0);
    setTotalRecovered(0);
    await sleep(300);
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
    await sleep(400);

    await fetch("/api/recovery/autopilot-execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [current.id] }),
    });

    setTotalRecovered((v) => v + (current.valueCents ?? 0));
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setLoading(false);

    await sleep(200);
    setPhase(nextIndex >= total ? "done" : "deciding");
  }

  function next() {
    setIndex((i) => i + 1);
    setPhase("deciding");
  }

  /* ---------------- MOBILE HEADER ---------------- */
  const phaseLabel =
    phase === "analyzing"
      ? "Analyse du contexte…"
      : phase === "deciding"
      ? "Action prioritaire identifiée"
      : phase === "executing"
      ? "Exécution en cours…"
      : phase === "done"
      ? "Auto-Pilot terminé"
      : "";

  return (
    <div className="space-y-5">
      {/* MOBILE HEADER */}
      <div className="md:hidden rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <h1 className="text-lg font-semibold text-white">Auto-Pilot</h1>
        <p className="mt-1 text-sm text-white/60">
          Laisse le moteur choisir la prochaine action à plus fort impact.
        </p>
      </div>

      {/* ÉTAT INTELLIGENT */}
      {phase !== "idle" && phase !== "done" && (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 flex justify-between">
          <span className="text-xs text-white/60">{phaseLabel}</span>
          {current && phase === "deciding" && (
            <span className="text-xs text-white/50">
              {getReason(current)}
            </span>
          )}
        </div>
      )}

      {/* PROGRESS */}
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex justify-between text-xs text-white/60 mb-2">
          <span>Progression</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded bg-white/10 overflow-hidden">
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

      {/* EMPTY */}
      {total === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center">
          <p className="text-white/60 mb-4">
            Aucune file Auto-Pilot active.
          </p>
          <button
            onClick={generateQueue}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 text-white font-semibold"
          >
            ⚡ Générer la file Auto-Pilot
          </button>
        </div>
      )}

      {/* CURRENT ITEM */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-white/10 bg-slate-950/70 p-5"
          >
            <div className="flex justify-between mb-3">
              <span className="text-xs px-2 py-1 rounded bg-white/10">
                🧠 Choix Auto-Pilot
              </span>
              <span className="text-xs text-white/60">
                Sévérité {current.severity}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-white mb-1">
              {current.title}
            </h2>

            <p className="text-sm text-white/50 mb-3">
              {getReason(current)}
            </p>

            {current.valueCents && (
              <p className="text-sm text-white/60 mb-4">
                Valeur estimée :{" "}
                {(current.valueCents / 100).toFixed(2)} $
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={markHandled}
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-white font-semibold"
              >
                ✓ Traiter
              </button>
              <button
                onClick={next}
                disabled={loading}
                className="rounded-xl bg-white/10 px-4 py-3 text-white"
              >
                ⏭
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {total > 0 && remaining === 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center">
          <p className="text-white font-semibold">
            🎉 Auto-Pilot terminé
          </p>
          <p className="text-sm text-white/60 mt-1">
            {total} actions analysées · Impact cumulé généré
          </p>
        </div>
      )}
    </div>
  );
}
