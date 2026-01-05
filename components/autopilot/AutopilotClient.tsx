"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Item = {
  id: string;
  type: string;
  severity: number;
  title: string;
  description?: string;
  action?: string;
  valueCents?: number;
};

type Phase = "idle" | "analyzing" | "deciding" | "executing" | "done";

function money(cents?: number) {
  const v = Math.round((cents ?? 0) / 100);
  return `${v.toLocaleString("fr-CA")} $`;
}

function pillForPhase(phase: Phase) {
  switch (phase) {
    case "analyzing":
      return { label: "Analyse", cls: "bg-white/5 border-white/10 text-white/80" };
    case "deciding":
      return { label: "Décision", cls: "bg-white/5 border-white/10 text-white/80" };
    case "executing":
      return { label: "Exécution", cls: "bg-[#c33541]/15 border-[#c33541]/35 text-white" };
    case "done":
      return { label: "Terminé", cls: "bg-emerald-400/10 border-emerald-400/25 text-white" };
    default:
      return { label: "Prêt", cls: "bg-white/5 border-white/10 text-white/80" };
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.queue)) return payload.queue;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export default function AutopilotClient() {
  const [queue, setQueue] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [totalRecoveredCents, setTotalRecoveredCents] = useState(0);
  const [log, setLog] = useState<
    { ts: number; label: string; sub?: string; kind?: "ok" | "warn" | "info" }[]
  >([]);

  const current = queue[index] ?? null;
  const total = queue.length;
  const remaining = Math.max(total - index, 0);
  const progress = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  const phasePill = pillForPhase(phase);

  const nextTitle = useMemo(() => {
    if (!current) return "Aucune action prioritaire";
    return current.title || "Action à exécuter";
  }, [current]);

  const nextValue = useMemo(() => money(current?.valueCents), [current?.valueCents]);

  function pushLog(entry: { label: string; sub?: string; kind?: "ok" | "warn" | "info" }) {
    setLog((prev) => [{ ts: Date.now(), ...entry }, ...prev].slice(0, 12));
  }

  async function generateQueue() {
    setBusy(true);
    setPhase("analyzing");
    pushLog({ label: "Analyse en cours…", kind: "info" });

    try {
      const res = await fetch("/api/recovery/autopilot-queue", { method: "POST" });
      const payload = await safeJson(res);
      const arr = extractArray(payload);

      const items: Item[] = arr
        .filter(Boolean)
        .map((x: any) => ({
          id: String(x.id),
          type: String(x.type ?? "UNKNOWN"),
          severity: Number(x.severity ?? 0),
          title: String(x.title ?? "Action"),
          description: x.description ? String(x.description) : undefined,
          action: x.action ? String(x.action) : undefined,
          valueCents: typeof x.valueCents === "number" ? x.valueCents : undefined,
        }));

      setQueue(items);
      setIndex(0);

      setPhase(items.length ? "deciding" : "done");
      pushLog({
        label: items.length ? "File prête" : "Rien à traiter",
        sub: items.length ? `${items.length} action(s) dans la file` : "Pipeline déjà clean",
        kind: items.length ? "ok" : "info",
      });
    } catch (e: any) {
      setPhase("idle");
      pushLog({ label: "Erreur lors de l’analyse", sub: String(e?.message ?? e), kind: "warn" });
    } finally {
      setBusy(false);
    }
  }

  async function executeCurrent() {
    if (!current || busy) return;

    setBusy(true);
    setPhase("executing");

    try {
      const res = await fetch("/api/recovery/autopilot-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });

      const payload = await safeJson(res);
      const recoveredCents =
        (typeof payload?.recoveredCents === "number" ? payload.recoveredCents : null) ??
        (typeof payload?.valueCents === "number" ? payload.valueCents : null) ??
        (current.valueCents ?? 0);

      setTotalRecoveredCents((v) => v + (recoveredCents ?? 0));

      pushLog({
        label: "Action exécutée",
        sub: `${current.title} • +${money(recoveredCents ?? 0)}`,
        kind: "ok",
      });

      // Next item
      const nextIndex = index + 1;
      setIndex(nextIndex);

      if (nextIndex >= queue.length) {
        setPhase("done");
        pushLog({ label: "Auto-Pilot terminé", sub: "File complétée", kind: "ok" });
      } else {
        setPhase("deciding");
      }
    } catch (e: any) {
      setPhase("deciding");
      pushLog({ label: "Erreur d’exécution", sub: String(e?.message ?? e), kind: "warn" });
    } finally {
      setBusy(false);
    }
  }

  async function skipCurrent() {
    if (!current || busy) return;
    pushLog({ label: "Action ignorée", sub: current.title, kind: "info" });

    const nextIndex = index + 1;
    setIndex(nextIndex);

    if (nextIndex >= queue.length) {
      setPhase("done");
      pushLog({ label: "Auto-Pilot terminé", sub: "File complétée", kind: "ok" });
    } else {
      setPhase("deciding");
    }
  }

  async function undoLast() {
    if (busy) return;
    setBusy(true);

    try {
      const res = await fetch("/api/recovery/autopilot-undo", { method: "POST" });
      const payload = await safeJson(res);

      const msg =
        typeof payload?.message === "string"
          ? payload.message
          : "Dernière action annulée (si disponible).";

      pushLog({ label: "Undo", sub: msg, kind: "info" });
      // Après undo, on régénère la file pour refléter l’état DB sans guess.
      await generateQueue();
    } catch (e: any) {
      pushLog({ label: "Undo impossible", sub: String(e?.message ?? e), kind: "warn" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Auto-load
    generateQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMobileSticky = true; // ⚠️ un seul sticky dans toute la page

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div
        className="
          rounded-2xl border
          bg-slate-950/60 backdrop-blur
          border-[rgba(195,53,65,0.45)]
          shadow-[0_0_0_3px_rgba(195,53,65,0.10)]
          p-5
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${phasePill.cls}`}
              >
                {phasePill.label}
              </span>

              <span className="text-xs text-white/50">
                {total === 0 ? "—" : `${progress}% • ${remaining} restant`}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-semibold text-white">
              Continuer l’action recommandée
            </h2>

            <p className="mt-1 text-sm text-white/60">
              Auto-Pilot prend la prochaine opportunité Recovery et te guide en exécution.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-white/50">Total récupéré</div>
            <div className="text-2xl font-semibold text-white">
              {money(totalRecoveredCents)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#c33541]/70"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generateQueue}
            disabled={busy}
            className="
              rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold
              text-white hover:bg-white/10 disabled:opacity-50
            "
          >
            Rafraîchir la file
          </button>

          <button
            onClick={undoLast}
            disabled={busy}
            className="
              rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold
              text-white hover:bg-white/10 disabled:opacity-50
            "
          >
            Undo
          </button>
        </div>
      </div>

      {/* NEXT STEP CARD */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current?.id ?? "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="
            rounded-2xl border border-white/10
            bg-white/5 backdrop-blur
            p-5
          "
        >
          {!current ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">
                  Rien à exécuter pour l’instant
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Ton pipeline est “propre”. Relance un scan plus tard.
                </div>
              </div>

              <a
                href="/audit"
                className="
                  rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold
                  text-white hover:bg-white/10
                "
              >
                Ouvrir Audit
              </a>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-white/50">
                    Prochaine action • {current.type} • Sévérité {current.severity}
                  </div>

                  <div className="mt-2 text-lg font-semibold text-white">{nextTitle}</div>

                  {current.description ? (
                    <div className="mt-2 text-sm text-white/70">{current.description}</div>
                  ) : null}

                  {current.action ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-white/75">
                      <div className="text-xs font-semibold text-white/70 mb-1">
                        Action suggérée
                      </div>
                      {current.action}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-white/50">Valeur</div>
                  <div className="mt-1 text-xl font-semibold text-white">{nextValue}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={executeCurrent}
                  disabled={busy}
                  className="
                    rounded-xl bg-[#c33541] px-5 py-2.5 text-sm font-semibold text-white
                    shadow-[0_10px_30px_rgba(195,53,65,0.25)]
                    hover:brightness-110 active:scale-[0.98] disabled:opacity-60
                  "
                >
                  Exécuter maintenant
                </button>

                <button
                  onClick={skipCurrent}
                  disabled={busy}
                  className="
                    rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold
                    text-white hover:bg-white/10 disabled:opacity-50
                  "
                >
                  Passer
                </button>

                <a
                  href="/audit"
                  className="
                    rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold
                    text-white hover:bg-white/10
                  "
                >
                  Ouvrir Audit
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* QUEUE */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">File Auto-Pilot</div>
            <div className="text-xs text-white/50">
              {total === 0 ? "Aucune action" : `${total} action(s) • ${remaining} restant`}
            </div>
          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            {progress}%
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {queue.length === 0 ? (
            <div className="text-sm text-white/60">—</div>
          ) : (
            queue.slice(index, index + 6).map((it, i) => {
              const isNow = i === 0;
              return (
                <div
                  key={it.id}
                  className={[
                    "rounded-xl border p-3",
                    isNow
                      ? "border-[rgba(195,53,65,0.40)] bg-slate-950/40"
                      : "border-white/10 bg-slate-950/20",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/50">
                        {isNow ? "Maintenant" : "À venir"} • {it.type} • sev {it.severity}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white truncate">
                        {it.title}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-white/90">
                      {money(it.valueCents)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* LOG */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold text-white">Journal</div>
        <div className="mt-3 space-y-2">
          {log.length === 0 ? (
            <div className="text-sm text-white/60">—</div>
          ) : (
            log.map((e) => (
              <div
                key={e.ts}
                className="rounded-xl border border-white/10 bg-slate-950/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{e.label}</div>
                  <div className="text-xs text-white/40">
                    {new Date(e.ts).toLocaleTimeString("fr-CA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {e.sub ? <div className="mt-1 text-sm text-white/70">{e.sub}</div> : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✅ UN SEUL sticky mobile (pas de doublon) */}
      {showMobileSticky ? (
        <div className="md:hidden fixed left-0 right-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-[1500px] px-4 pb-4">
            <div
              className="
                rounded-2xl border
                bg-slate-950/95 backdrop-blur
                border-[rgba(195,53,65,0.55)]
                shadow-[0_0_0_3px_rgba(195,53,65,0.10)]
                px-4 py-3
              "
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate text-white">
                    {current ? "Continuer Auto-Pilot" : "Auto-Pilot"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {current ? "Exécuter l’action maintenant" : "Aucune action prioritaire"}
                  </div>
                </div>

                <button
                  onClick={executeCurrent}
                  disabled={!current || busy}
                  className="
                    shrink-0 px-4 py-2 rounded-xl
                    bg-[#c33541] text-white
                    text-sm font-semibold
                    shadow-[0_10px_30px_rgba(195,53,65,0.25)]
                    hover:brightness-110 active:scale-[0.98]
                    disabled:opacity-60
                  "
                >
                  Continuer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* spacer pour sticky */}
      <div className="h-24 md:h-0" />
    </div>
  );
}
