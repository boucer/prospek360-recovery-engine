// app/(app)/audit/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

import FocusFinding from "@/components/audit/FocusFinding";
import AuditAutoScroll from "@/components/audit/AuditAutoScroll";
import RunAuditButton from "@/components/audit/RunAuditButton";
import ViewLastReportButton from "@/components/audit/ViewLastReportButton";

import NextBestActionClient from "@/components/audit/NextBestActionClient";
import RecoveryFindingsPanel from "@/components/audit/RecoveryFindingsPanel";
import PendingUndoPanel from "@/components/audit/PendingUndoPanel";
import AuditRunsTable from "@/components/audit/AuditRunsTable";

const MAX_RUNS = 8;

type SearchParamsLike = Record<string, string | string[] | undefined>;
type AuditSearchParams = {
  focus?: string;
  autoSelect?: string;
};
export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsLike> | SearchParamsLike;
}) {
  // ✅ Next.js (v15+ / v16): searchParams peut être une Promise
  const sp = (await Promise.resolve(searchParams ?? {})) as SearchParamsLike;

  const focus = typeof sp.focus === "string" ? sp.focus : "";
  const autoSelect = typeof sp.autoSelect === "string" ? sp.autoSelect : "";

  // ---- DATA ----
  const runs = await prisma.auditRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
    },
  });

  const lastRunId = runs?.[0]?.id ?? null;

  const findingsLastRun = lastRunId
    ? await prisma.recoveryFinding.findMany({
        where: { auditRunId: lastRunId },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 200,
        select: {
          id: true,
          auditRunId: true,
          type: true,
          title: true,
          description: true,
          action: true,
          severity: true,
          valueCents: true,
          createdAt: true,
          updatedAt: true,
          handled: true,
          handledAt: true,
          autopilotQueued: true,
          autopilotQueuedAt: true,
        },
      })
    : [];

  // ---- LOGIQUE: choisir “currentOpp” (garde ton behaviour existant) ----
  // focus=priority => prend le plus sévère non traité
  // focus=<findingId> => highlight
  // autoSelect=top => sélection top automatiquement (si tu veux)
  const activeFindings = (findingsLastRun ?? []).filter((f: any) => !f.handled);

  const topOpp = activeFindings?.[0] ?? null;
  const focusId =
    typeof sp.focus === "string" && sp.focus && sp.focus !== "priority"
      ? sp.focus
      : null;

  const currentOpp =
    focus === "priority"
      ? topOpp
      : focusId
      ? (activeFindings ?? []).find((f: any) => f.id === focusId) ?? topOpp
      : autoSelect === "top"
      ? topOpp
      : topOpp;

  const ageDays = currentOpp?.createdAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(currentOpp.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // ✅ Aperçu historique (évite “runsPreview is not defined”)
  const runsPreview = Array.isArray(runs) ? runs.slice(0, MAX_RUNS) : [];

  return (
    <>
      {/* ✅ V1.1 Focus depuis le rapport */}
      <FocusFinding />

      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-[1500px] p-6 lg:p-8 space-y-8">
          <AuditAutoScroll reportTargetId="opportunities-section" />

          <header className="space-y-2">
            <h1 className="text-2xl font-semibold">Audit</h1>
            <p className="text-sm text-slate-300/70">
              Analyse des contacts et détection des opportunités de recovery.
            </p>
          </header>

          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <RunAuditButton />
            <ViewLastReportButton />
          </div>

          {/* ✅ Layout principal: GAUCHE (table + en attente + historique) / DROITE (hero) */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_520px]">
            {/* COLONNE GAUCHE */}
            <section id="opportunities-section" className="space-y-6">
              <RecoveryFindingsPanel
                findings={findingsLastRun as any}
                highlightFindingId={currentOpp?.id ?? null}
              />

              {/* ✅ En attente / Undo (indépendant, sous la liste principale) */}
              <PendingUndoPanel />

              {/* ✅ Historique des audits (aperçu) */}
              <div className="rounded-2xl border border-white/10 bg-slate-950">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Historique
                    </div>
                    <div className="text-xs text-slate-400">
                      Activités récentes & audits précédents (aperçu)
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {Math.min(runsPreview.length, MAX_RUNS)}/{runs?.length ?? 0}
                  </div>
                </div>

                <div className="p-4">
                  <AuditRunsTable runs={runsPreview as any} />

                  {Array.isArray(runs) && runs.length > MAX_RUNS ? (
                    <div className="mt-3 flex justify-end">
                      <Link
                        href="/audit/report"
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        Voir le dernier rapport →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            {/* HERO / NEXT ACTION */}
            <aside className="lg:sticky lg:top-6 self-start">
              <NextBestActionClient
  opportunity={currentOpp as any}
/>

            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
