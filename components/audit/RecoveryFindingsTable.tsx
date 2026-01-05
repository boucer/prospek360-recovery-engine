"use client";

import { useMemo, useState } from "react";
import type { RecoveryFinding } from "@prisma/client";
import RecoveryFindingActions from "@/components/audit/RecoveryFindingActions";

function formatCADCompact(cents: number) {
  const dollars = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function severityLabel(n: number) {
  if (n >= 5) return "Très élevé";
  if (n === 4) return "Élevé";
  if (n === 3) return "Moyen";
  if (n === 2) return "Faible";
  return "Info";
}

function severityPill(n: number) {
  if (n >= 5) return "bg-red-500/15 border-red-500/35 text-red-200";
  if (n === 4) return "bg-rose-500/12 border-rose-500/30 text-rose-200";
  if (n === 3) return "bg-amber-500/12 border-amber-500/30 text-amber-200";
  if (n === 2) return "bg-emerald-500/10 border-emerald-500/25 text-emerald-200";
  return "bg-white/5 border-white/10 text-slate-200";
}

export default function RecoveryFindingsTable({
  findings,
  highlightFindingId,
  highlightType,
  onMarkAsHandled,
}: {
  findings: RecoveryFinding[];
  highlightFindingId?: string | null;
  highlightType?: string | null;
  onMarkAsHandled?: (finding: RecoveryFinding) => void;
}) {
  const isEmpty = !findings || findings.length === 0;

  const [selected, setSelected] = useState<RecoveryFinding | null>(null);

  const sorted = useMemo(() => {
    const arr = Array.isArray(findings) ? [...findings] : [];
    // Tri: severity desc, value desc
    arr.sort((a, b) => {
      const s = (b.severity ?? 0) - (a.severity ?? 0);
      if (s !== 0) return s;
      return (b.valueCents ?? 0) - (a.valueCents ?? 0);
    });
    return arr;
  }, [findings]);

  return (
    <div className="relative">
      {/* MOBILE — Cartes + modal (WOW) */}
      <div className="md:hidden space-y-3">
        {isEmpty ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Aucune opportunité trouvée.
          </div>
        ) : (
          sorted.map((f) => {
            const isHighlighted =
              (highlightFindingId && f.id === highlightFindingId) ||
              (highlightType && f.type === highlightType);

            return (
              <div
                key={f.id}
                className={[
                  "rounded-2xl border bg-white/5 p-4 shadow-sm",
                  isHighlighted ? "border-red-500/35" : "border-white/10",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          severityPill(f.severity ?? 0),
                        ].join(" ")}
                      >
                        {severityLabel(f.severity ?? 0)}
                      </span>

                      <span className="text-[11px] text-slate-300/60">
                        {String(f.type || "").replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-100">
                      {f.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-200/75">
                      {f.description?.length > 110
                        ? `${f.description.slice(0, 110)}…`
                        : f.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-300/70">Valeur</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-100">
                      {formatCADCompact(f.valueCents ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(f)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                  >
                    Voir détails
                  </button>

                  <div className="min-w-0">
                    <RecoveryFindingActions
                      action={f.action}
                      handled={Boolean((f as any).handled)}
                      valueCents={f.valueCents ?? 0}
                      onMarkHandled={() => onMarkAsHandled?.(f)}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP — tableau complet */}
      <div className="hidden md:block relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-300/70">
                <th className="p-3">Priorité</th>
                <th className="p-3">Type</th>
                <th className="p-3">Détail</th>
                <th className="p-3 text-right">Valeur</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {isEmpty ? (
                <tr>
                  <td className="p-4 text-slate-300" colSpan={5}>
                    Aucune opportunité trouvée.
                  </td>
                </tr>
              ) : (
                sorted.map((f) => {
                  const isHighlighted =
                    (highlightFindingId && f.id === highlightFindingId) ||
                    (highlightType && f.type === highlightType);

                  return (
                    <tr
                      key={f.id}
                      className={isHighlighted ? "bg-red-500/5" : ""}
                    >
                      <td className="p-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
                            severityPill(f.severity ?? 0),
                          ].join(" ")}
                        >
                          {severityLabel(f.severity ?? 0)}
                        </span>
                      </td>

                      <td className="p-3 text-slate-300">
                        <div className="font-medium text-slate-100">
                          {f.title}
                        </div>
                        <div className="text-xs text-slate-300/70">
                          {String(f.type || "")}
                        </div>
                      </td>

                      <td className="p-3 text-slate-300">
                        <div className="whitespace-normal break-words">
                          {f.description}
                        </div>
                        <div className="mt-1 text-xs">
                          Recommandation : <b>{f.action}</b>
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-semibold text-slate-100">
                          {formatCADCompact(f.valueCents ?? 0)}
                        </div>
                      </td>

                      <td className="p-3">
                        <RecoveryFindingActions
                          action={f.action}
                          handled={Boolean((f as any).handled)}
                          valueCents={f.valueCents ?? 0}
                          onMarkHandled={() => onMarkAsHandled?.(f)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MOBILE */}
      {selected ? (
        <div
          className="md:hidden fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-[520px] rounded-t-3xl border border-white/10 bg-slate-950 p-5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      severityPill(selected.severity ?? 0),
                    ].join(" ")}
                  >
                    {severityLabel(selected.severity ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-300/60">
                    {String(selected.type || "").replaceAll("_", " ")}
                  </span>
                </div>

                <p className="mt-2 text-base font-semibold text-slate-100">
                  {selected.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300/70">Détail</p>
              <p className="mt-2 text-sm text-slate-200/85 whitespace-pre-wrap">
                {selected.description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-[11px] text-slate-300/70">Valeur</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {formatCADCompact(selected.valueCents ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <p className="text-[11px] text-slate-300/70">Recommandation</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {selected.action}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <RecoveryFindingActions
                action={selected.action}
                handled={Boolean((selected as any).handled)}
                valueCents={selected.valueCents ?? 0}
                onMarkHandled={() => onMarkAsHandled?.(selected)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
