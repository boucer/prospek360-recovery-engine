// components/audit/RecoveryFindingsPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecoveryFinding } from "@prisma/client";
import RecoveryFindingsTable from "@/components/audit/RecoveryFindingsTable";
import RecoveryFindingActions from "@/components/audit/RecoveryFindingActions";

function formatCAD(cents: number) {
  const v = (cents ?? 0) / 100;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(v);
}

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
  return "Très faible";
}

function severityChipClasses(n: number) {
  if (n >= 5) return "border-red-500/40 bg-red-500/10 text-red-100";
  if (n === 4) return "border-rose-500/35 bg-rose-500/10 text-rose-100";
  if (n === 3) return "border-amber-500/35 bg-amber-500/10 text-amber-100";
  if (n === 2) return "border-sky-500/30 bg-sky-500/10 text-sky-100";
  return "border-white/15 bg-white/5 text-slate-100";
}

/* =========================
   Toast bottom-right (WOW)
========================= */
function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="whitespace-pre-line text-sm font-semibold text-slate-100">{message}</div>
      <div className="mt-1 text-[11px] text-slate-300/70">Recovery Engine • WOW</div>
    </div>
  );
}

type SortOption = "severity_desc" | "severity_asc" | "newest" | "oldest";

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={[
        "fixed inset-0 z-[80]",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* panel */}
      <div
        className={[
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-[680px]",
          "transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-[110%]",
        ].join(" ")}
      >
        <div className="rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/15" />
              {title ? (
                <div className="truncate text-sm font-semibold text-slate-100">{title}</div>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
            >
              Fermer
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

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

  // UI state (V1: figé, simple)
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

      showToast(
        `✅ Traité — ${formatCAD((finding as any).valueCents ?? 0)} récupérés`,
        2000
      );
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

  /* =========================
     Mobile sheet
  ========================= */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<RecoveryFinding | null>(null);

  function openFinding(f: RecoveryFinding) {
    setSelected(f);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
    // petit délai pour l'anim
    setTimeout(() => setSelected(null), 180);
  }

  return (
    <div className="space-y-3">
      <Toast message={toast} />

      {/* MOBILE: cards */}
      <div className="block md:hidden">
        {processed.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
            Aucune opportunité détectée.
          </div>
        ) : (
          <div className="space-y-3">
            {processed.map((f: any) => {
              const isPriority =
                !f.handled &&
                ((highlightFindingId && f.id === highlightFindingId) ||
                  (highlightType && f.type === highlightType));

              return (
                <button
  id={`finding-${f.id}`}
  key={f.id}
  onClick={() => openFinding(f)}
  className={[

                    "w-full text-left rounded-2xl border bg-white/5 p-4 shadow-sm transition",
                    "active:scale-[0.99] hover:bg-white/10",
                    isPriority
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
                            severityChipClasses(Number(f.severity ?? 0)),
                          ].join(" ")}
                        >
                          {severityLabel(Number(f.severity ?? 0))}
                        </span>

                        <span className="text-[11px] text-slate-300/70">
                          {String(f.type ?? "—")}
                        </span>
                      </div>

                      <div className="mt-2 font-semibold text-slate-100 line-clamp-2">
                        {String(f.title ?? "Opportunité")}
                      </div>

                      <div className="mt-2 text-sm text-slate-300/85 line-clamp-2">
                        {String(f.description ?? "")}
                      </div>

                      <div className="mt-2 text-[11px] text-slate-300/70">
                        Recommandation :{" "}
                        <span className="font-semibold text-slate-100">
                          {String(f.action ?? "")}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-300/70">Valeur</div>
                      <div className="mt-1 text-lg font-semibold text-slate-100">
                        {formatCADCompact(Number(f.valueCents ?? 0))}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-300/60">
                        Tap pour ouvrir →
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP: table intact */}
      <div className="hidden md:block">
        <RecoveryFindingsTable
          findings={processed}
          highlightFindingId={highlightFindingId}
          highlightType={highlightType}
          onMarkAsHandled={markAsHandled}
        />
      </div>

      {/* Bottom sheet (mobile) */}
      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={selected ? String((selected as any).title ?? "Détails") : undefined}
      >
        {!selected ? null : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold",
                  severityChipClasses(Number((selected as any).severity ?? 0)),
                ].join(" ")}
              >
                {severityLabel(Number((selected as any).severity ?? 0))}
              </span>

              <span className="text-[11px] text-slate-300/70">
                {String((selected as any).type ?? "—")}
              </span>

              <span className="ml-auto text-sm font-semibold text-slate-100">
                {formatCADCompact(Number((selected as any).valueCents ?? 0))}
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300/70">
                Détail
              </div>
              <div className="mt-2 whitespace-pre-line text-sm text-slate-200">
                {String((selected as any).description ?? "")}
              </div>

              <div className="mt-3 text-xs text-slate-300/70">
                Recommandation :{" "}
                <span className="font-semibold text-slate-100">
                  {String((selected as any).action ?? "")}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300/70">
                Actions
              </div>

              <div className="mt-3">
                <RecoveryFindingActions
                  action={String((selected as any).action ?? "")}
                  handled={Boolean((selected as any).handled)}
                  valueCents={Number((selected as any).valueCents ?? 0)}
                  onMarkHandled={async () => {
                    await markAsHandled(selected);
                    closeSheet();
                  }}
                />
              </div>

              <div className="mt-3 text-[11px] text-slate-300/60">
                Astuce : “Copier” déclenche ton toast WOW automatiquement (event recovery:copied).
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
