// app/(app)/audit/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import RunAuditButton from "@/components/audit/RunAuditButton";
import AuditRunsTable from "@/components/audit/AuditRunsTable";
import RecoveryFindingsPanel from "@/components/audit/RecoveryFindingsPanel";
import NextBestActionClient from "@/components/audit/NextBestActionClient";
import AuditAutoScroll from "@/components/audit/AuditAutoScroll";
import ViewLastReportButton from "@/components/audit/ViewLastReportButton";
import DrilldownStatusBar from "@/components/audit/DrilldownStatusBar";
import PendingUndoPanel from "@/components/audit/PendingUndoPanel";

export const dynamic = "force-dynamic";

/* =======================
   Helpers
======================= */
function daysAgo(date: Date) {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

type HeroMode = "urgent" | "noreply" | "all";
type FocusKey =
  | "revenue"
  | "loss"
  | "score"
  | "delay"
  | "history"
  | "global"
  | "noreply"
  | string;
type AutoSelectKey = "top" | "latest" | "critical" | "none" | string;

function addOrReplaceQuery(
  path: string,
  params: Record<string, string | null | undefined>
) {
  const url = new URL(path, "http://local");
  for (const [k, v] of Object.entries(params)) {
    if (!v) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  return url.toString().replace("http://local", "");
}

function priorityLabelFromSeverity(sev: number) {
  if (sev >= 5) return "Très élevée";
  if (sev === 4) return "Élevée";
  if (sev === 3) return "Moyenne";
  return "Faible";
}

type Opportunity = {
  id: string; // ✅ IMPORTANT: utilisé par NextBestActionClient (fetch /handle)
  findingId: string;
  severity: number;
  createdAt: string;
  handledAt?: string | null;

  priorityLabel: string;
  typeLabel: string;
  typeCode: string;
  detail: string;
  valueCents: number;
  treated: boolean;
};

function decideNbaModeFromFocus(focus: FocusKey | null | undefined): HeroMode {
  if (!focus) return "urgent";
  const f = String(focus).toLowerCase();
  if (f === "noreply") return "noreply";
  if (["loss", "revenue", "global"].includes(f)) return "all";
  return "urgent";
}

function autoPickFindingId(
  list: Opportunity[],
  autoSelect: AutoSelectKey | null | undefined
): string | null {
  if (!list.length) return null;
  const a = (autoSelect ?? "none").toLowerCase();

  if (a === "latest") {
    return (
      list
        .slice()
        .sort(
          (x, y) =>
            new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
        )[0]?.findingId ?? null
    );
  }

  if (a === "critical" || a === "top") {
    return (
      list
        .slice()
        .sort((aa, bb) => {
          if (aa.severity !== bb.severity) return bb.severity - aa.severity;
          return (bb.valueCents ?? 0) - (aa.valueCents ?? 0);
        })[0]?.findingId ?? null
    );
  }

  return null;
}

function formatMoney(cents: number) {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<{
    nba?: string;
    nbaMode?: string;
    view?: string;
    history?: string;
    focus?: string;
    autoSelect?: string;
    require?: string;
    next?: string;
  }>;
}) {
  const sp = (await searchParams) ?? {};

  if (sp.require === "inbox") {
    redirect(`/activation/inbox?next=${encodeURIComponent(sp.next || "/audit")}`);
  }
  if (sp.require === "pro") {
    redirect(
      `/upgrade?next=${encodeURIComponent(sp.next || "/audit")}&reason=recovery`
    );
  }

  const runs = await prisma.auditRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const lastRunId = runs[0]?.id;

  const findingsLastRun = lastRunId
    ? await prisma.recoveryFinding.findMany({
        where: { auditRunId: lastRunId },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const opportunities: Opportunity[] = findingsLastRun.map((f) => {
    const ff = f as any;
    const created =
      f.createdAt?.toISOString?.() ??
      new Date(ff.createdAt ?? Date.now()).toISOString();

    const handledAt =
      f.handledAt?.toISOString?.() ??
      (ff.handledAt ? new Date(ff.handledAt).toISOString() : null);

    const valueCents = Number(ff.valueCents ?? 0);

    return {
      id: f.id, // ✅ crucial (sinon /undefined/handle)
      findingId: f.id,
      severity: Number(ff.severity ?? 0),
      createdAt: created,
      handledAt,
      priorityLabel: priorityLabelFromSeverity(Number(ff.severity ?? 0)),
      typeLabel: String(ff.title ?? ff.type ?? "Opportunité"),
      typeCode: String(ff.type ?? "UNKNOWN"),
      detail: String(ff.description ?? ""),
      valueCents,
      treated: Boolean(ff.handled),
    };
  });

  const focus = sp.focus ?? null;
  const autoSelect = sp.autoSelect ?? null;

  const nbaMode: HeroMode =
    sp.nbaMode === "noreply"
      ? "noreply"
      : sp.nbaMode === "all"
      ? "all"
      : decideNbaModeFromFocus(focus);

  // ✅ Liste Hero = seulement NON traitées
  const heroList = opportunities
    .filter((o) => !o.treated)
    .filter((o) =>
      nbaMode === "urgent" ? o.severity >= 4 : nbaMode === "noreply" ? true : true
    );

  const picked = sp.nba ?? autoPickFindingId(heroList, autoSelect) ?? "";
  const currentOpp =
    heroList.find((x) => x.findingId === picked) ?? heroList[0] ?? null;

  const ageDays = currentOpp ? daysAgo(new Date(currentOpp.createdAt)) : 0;

  const baseParamsKeep: Record<string, string | null | undefined> = {
    view: sp.view ?? null,
    history: sp.history ?? null,
    focus: sp.focus ?? null,
    autoSelect: sp.autoSelect ?? null,
  };

  const idx = currentOpp
    ? heroList.findIndex((x) => x.findingId === currentOpp.findingId)
    : -1;

  const prevOpp = idx > 0 ? heroList[idx - 1] : null;
  const nextOpp = idx >= 0 && idx < heroList.length - 1 ? heroList[idx + 1] : null;

  const prevHref = prevOpp
    ? addOrReplaceQuery("/audit", { ...baseParamsKeep, nbaMode, nba: prevOpp.findingId })
    : "#";
  const nextHref = nextOpp
    ? addOrReplaceQuery("/audit", { ...baseParamsKeep, nbaMode, nba: nextOpp.findingId })
    : "#";

  const firstInMode = heroList[0]?.findingId ?? "";
  const urgentHref = addOrReplaceQuery("/audit", {
    ...baseParamsKeep,
    nbaMode: "urgent",
    nba: firstInMode || null,
  });
  const noreplyHref = addOrReplaceQuery("/audit", {
    ...baseParamsKeep,
    nbaMode: "noreply",
    nba: firstInMode || null,
  });
  const allHref = addOrReplaceQuery("/audit", {
    ...baseParamsKeep,
    nbaMode: "all",
    nba: firstInMode || null,
  });

  const hasDrilldownContext = !!(focus || autoSelect);

  /* =======================
     ✅ Pending / Confirmed (Undo Window)
  ======================= */
  const nowMs = Date.now();
  const UNDO_WINDOW_MS = 5 * 60 * 1000;

  const handledSorted = opportunities
    .filter((o) => o.treated)
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.handledAt ?? a.createdAt).getTime();
      const tb = new Date(b.handledAt ?? b.createdAt).getTime();
      return tb - ta;
    });

  const pendingHandled = handledSorted.filter((o) => {
    const t = new Date(o.handledAt ?? o.createdAt).getTime();
    return nowMs - t < UNDO_WINDOW_MS;
  });

  const confirmedHandled = handledSorted.filter((o) => {
    const t = new Date(o.handledAt ?? o.createdAt).getTime();
    return nowMs - t >= UNDO_WINDOW_MS;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-[1500px] p-6 lg:p-8 space-y-8">
        <AuditAutoScroll reportTargetId="opportunities-section" />

        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Audit</h1>
              <p className="text-sm text-slate-300/70">
                Analyse des contacts et détection des opportunités de recovery.
              </p>
            </div>

            {/* ✅ Sortie unique (évite la confusion) */}
            <Link
              href="/recovery"
              className="hidden md:inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Dashboard
            </Link>
          </div>

          {hasDrilldownContext && (
            <DrilldownStatusBar
              focus={String(focus)}
              autoSelect={String(autoSelect)}
              mode={nbaMode}
            />
          )}
        </header>

        {/* ✅ Actions responsive / full-width (mobile) */}
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:gap-3 w-full">
            <div className="w-full sm:w-auto">
              <RunAuditButton />
            </div>
            <div className="w-full sm:w-auto">
              <ViewLastReportButton />
            </div>
          </div>

          <div className="hidden sm:block" />
        </div>

        {/* ✅ GRID: Hero en premier sur mobile (moins de scroll) */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_520px]">
          {/* RIGHT — en premier sur mobile */}
          <aside className="order-first lg:order-last lg:sticky lg:top-6 self-start">
            <NextBestActionClient
              opportunity={currentOpp as any}
              ageDays={ageDays}
              prevHref={prevHref}
              nextHref={nextHref}
              urgentHref={urgentHref}
              noreplyHref={noreplyHref}
              allHref={allHref}
            />
          </aside>

          {/* LEFT */}
          <section className="order-last lg:order-first space-y-8 min-w-0">
            <div id="opportunities-section" className="min-w-0">
              <RecoveryFindingsPanel
                findings={findingsLastRun as any}
                highlightFindingId={currentOpp?.findingId ?? null}
                highlightType={currentOpp?.typeCode ?? null}
              />
            </div>

            <section id="historique" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Historique</h2>

                {/* ✅ Chips compact mobile */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    Undo: {pendingHandled.length}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    Confirmé: {confirmedHandled.length}
                  </span>
                </div>
              </div>

              {/* ✅ MOBILE: collapsé (gros gain de scroll) */}
              <div className="sm:hidden space-y-3">
                <details className="rounded-2xl border border-white/10 bg-white/5 p-4" open={pendingHandled.length > 0}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">En attente (Undo)</p>
                        <p className="text-xs text-slate-300/70">
                          Annulable ~5 minutes.
                        </p>
                      </div>
                      <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
                        {pendingHandled.length}
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3">
                    <PendingUndoPanel
                      items={pendingHandled.map((o) => ({
                        id: o.id,
                        title: o.typeLabel,
                        priorityLabel: o.priorityLabel,
                        valueCents: o.valueCents,
                        handledAtISO: o.handledAt ?? o.createdAt,
                        detail: o.detail,
                      }))}
                    />
                  </div>
                </details>

                <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Activité récente</p>
                        <p className="text-xs text-slate-300/70">
                          Confirmé (Undo passé).
                        </p>
                      </div>
                      <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
                        {confirmedHandled.length}
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3">
                    {confirmedHandled.length === 0 ? (
                      <div className="text-sm text-slate-300/60">
                        Rien de confirmé pour l’instant.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {confirmedHandled.slice(0, 6).map((o) => (
                          <div
                            key={o.findingId}
                            className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-100">
                                {o.typeLabel}
                              </span>
                              <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                                {o.priorityLabel}
                              </span>
                              {o.valueCents > 0 && (
                                <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                                  {formatMoney(o.valueCents)}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-300/70 line-clamp-2">
                              {o.detail}
                            </div>
                          </div>
                        ))}
                        {confirmedHandled.length > 6 && (
                          <div className="text-xs text-slate-300/60">
                            +{confirmedHandled.length - 6} autre(s)…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </details>

                <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Historique des audits</p>
                        <p className="text-xs text-slate-300/70">Voir les runs.</p>
                      </div>
                      <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
                        {runs.length}
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3">
                    <AuditRunsTable runs={runs} />
                  </div>
                </details>
              </div>

              {/* ✅ DESKTOP: inchangé (toujours ouvert) */}
              <div className="hidden sm:block space-y-3">
                <PendingUndoPanel
                  items={pendingHandled.map((o) => ({
                    id: o.id,
                    title: o.typeLabel,
                    priorityLabel: o.priorityLabel,
                    valueCents: o.valueCents,
                    handledAtISO: o.handledAt ?? o.createdAt,
                    detail: o.detail,
                  }))}
                />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Activité récente (confirmé)
                      </h3>
                      <p className="text-xs text-slate-300/70">
                        Actions traitées et confirmées (la fenêtre Undo est passée).
                      </p>
                    </div>
                    <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-1 text-slate-200">
                      {confirmedHandled.length}
                    </span>
                  </div>

                  {confirmedHandled.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-300/60">
                      Rien de confirmé pour l’instant.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {confirmedHandled.slice(0, 8).map((o) => (
                        <div
                          key={o.findingId}
                          className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">
                              {o.typeLabel}
                            </span>
                            <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                              {o.priorityLabel}
                            </span>
                            {o.valueCents > 0 && (
                              <span className="text-[11px] rounded-full border border-white/10 bg-slate-900/60 px-2 py-0.5 text-slate-200">
                                {formatMoney(o.valueCents)}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-300/60">
                              {new Date(
                                o.handledAt ?? o.createdAt
                              ).toLocaleString("fr-CA")}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-300/70 line-clamp-2">
                            {o.detail}
                          </div>
                        </div>
                      ))}

                      {confirmedHandled.length > 8 && (
                        <div className="text-xs text-slate-300/60">
                          +{confirmedHandled.length - 8} autre(s) confirmé(s)…
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold">Historique des audits</h3>
                  <AuditRunsTable runs={runs} />
                </div>
              </div>

              {/* ✅ Accueil relégué en footer discret */}
              <div className="pt-2">
                <Link
                  href="/"
                  className="text-xs text-slate-300/60 hover:text-slate-200"
                >
                  ← Accueil
                </Link>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
