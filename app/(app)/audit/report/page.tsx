import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintReportButton from "@/components/audit/PrintReportButton";
import { cookies } from "next/headers";

/* =========================
   Utils
========================= */
function money(cents?: number | null) {
  const v = Math.round((cents ?? 0) / 100);
  return `${v.toLocaleString("fr-CA")} $`;
}

async function hasNextAuthSessionCookie() {
  const jar = await cookies();
  const devToken = jar.get("next-auth.session-token")?.value;
  const secureToken = jar.get("__Secure-next-auth.session-token")?.value;
  return Boolean(devToken || secureToken);
}

/* =========================
   Page
========================= */
export default async function AuditLastReportPage({
  searchParams,
}: {
  searchParams?: { client?: string };
}) {
  const clientName = (searchParams?.client || "").trim() || "Client";

  /* =====================================================
     🔒 NON CONNECTÉ → EXEMPLE DE RAPPORT (DÉMO)
     ===================================================== */
  if (!(await hasNextAuthSessionCookie())) {
    return (
      <main className="mx-auto max-w-[1500px] p-6 space-y-8">
        {/* HERO */}
        <section className="rounded-2xl border-2 border-red-600 bg-slate-950 p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Exemple de rapport — Résumé exécutif
              </h1>
              <p className="text-sm text-slate-400">
                Démo · 3 actions traitées · 420 $ récupéré
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login?callbackUrl=%2Frecovery"
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Ouvrir l’app →
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                ← Accueil
              </Link>
            </div>
          </div>

          <p className="text-slate-300 text-sm">
            Ceci est un exemple. Connecte-toi pour générer ton vrai rapport à
            partir de tes données.
          </p>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="font-semibold text-white">✔️ Actions traitées</div>
            <div className="mt-2 text-sm text-slate-300/80">
              3 actions · 420 $
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="font-semibold text-white">🔥 Prochaine action</div>
            <div className="mt-2 text-sm text-slate-300/80">
              Relance “no reply” 72h+ (message court)
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="font-semibold text-white">📌 Focus</div>
            <div className="mt-2 text-sm text-slate-300/80">
              Copier → Envoyer → Marquer traité
            </div>
          </div>
        </section>

        {/* DÉTAILS DÉMO */}
        <section className="rounded-xl border border-white/10 bg-slate-950">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold text-white">
              Détails (exemple)
            </div>
            <div className="text-xs text-slate-400">
              Aperçu du format réel du rapport
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {[
              {
                status: "Traité",
                title: "High intent — proposer 2 créneaux aujourd’hui",
                value: "250 $",
              },
              {
                status: "Traité",
                title: "No reply — relance courte (72h+)",
                value: "120 $",
              },
              {
                status: "À traiter",
                title: "Devis envoyé — suivi simple (48h+)",
                value: "80 $",
              },
            ].map((x) => (
              <div key={x.title} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          x.status === "Traité"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-700/40 text-slate-300"
                        }`}
                      >
                        {x.status}
                      </span>
                      <span className="text-slate-400">Démo</span>
                    </div>

                    <div className="mt-1 font-semibold text-white">
                      {x.title}
                    </div>

                    <div className="text-sm text-slate-400 mt-1">
                      Action recommandée prête à exécuter.
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Valeur</div>
                    <div className="text-sm font-semibold text-white">
                      {x.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  /* =====================================================
     🔓 CONNECTÉ → RAPPORT RÉEL (TON CODE ORIGINAL)
     ===================================================== */

  const lastRun = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (!lastRun) {
    return (
      <main className="mx-auto max-w-[1500px] p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-white">Dernier rapport</h1>
        <div className="rounded-xl border border-white/10 bg-slate-950 p-6 text-slate-300">
          Aucun rapport disponible pour l’instant.
        </div>
      </main>
    );
  }

  const findings = await prisma.recoveryFinding.findMany({
    where: { auditRunId: lastRun.id },
    orderBy: [{ severity: "desc" }, { valueCents: "desc" }],
  });

  const treated = findings.filter((f) => f.handled).length;
  const recovered = findings.reduce(
    (acc, f) => acc + (f.handled ? f.valueCents ?? 0 : 0),
    0
  );

  const untreated = findings.filter((f) => !f.handled);
  const nextAction = untreated[0];

  const queued = findings.filter((f) => !f.handled && Boolean(f.autopilotQueuedAt));

  return (
    <main className="mx-auto max-w-[1500px] p-6 space-y-8">
      {/* =========================
          V1.2 — HEADER PDF (PRINT ONLY)
         ========================= */}
      <div className="hidden print:block border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/brand/prospek360.png"
              alt="Prospek360"
              className="h-8 w-auto"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Rapport Recovery Engine
              </div>
              <div className="text-xs text-slate-600">Client : {clientName}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-600">Date</div>
            <div className="text-sm font-semibold text-slate-900">
              {new Date(lastRun.createdAt).toLocaleDateString("fr-CA", {
                year: "numeric",
                month: "long",
                day: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* HERO – Résumé exécutif */}
      <section className="rounded-2xl border-2 border-red-600 bg-slate-950 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Rapport — Résumé exécutif
            </h1>
            <p className="text-sm text-slate-400">
              {treated} action{treated > 1 ? "s" : ""} traitée
              {treated > 1 ? "s" : ""} · {money(recovered)} récupéré
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PrintReportButton />
            <Link
              href="/audit"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Audit
            </Link>
          </div>
        </div>

        <p className="text-slate-300 text-sm">
          Analyse complétée. Voici ce qui a changé depuis le dernier audit.
        </p>
      </section>

      {/* ACTIONS TRAITÉES */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">✔️ Actions traitées</h2>

        {findings.filter((f) => f.handled).length === 0 && (
          <div className="rounded-xl border border-white/10 bg-slate-900 p-4 text-slate-400">
            Aucune action traitée pour l’instant.
          </div>
        )}

        {findings
          .filter((f) => f.handled)
          .map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-white/10 bg-slate-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">{f.title}</div>
                  <div className="text-sm text-slate-400">{f.action}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Impact</div>
                  <div className="text-lg font-semibold text-emerald-400">
                    {money(f.valueCents)}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* ✅ ACTIONS MISES EN FILE (AUTO-PILOT) */}
      {queued.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            🤖 Actions mises en file (Auto-Pilot)
          </h2>

          {queued.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-white/10 bg-slate-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">{f.title}</div>
                  <div className="text-sm text-slate-400">
                    Action prête à enchaîner automatiquement ou manuellement.
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Impact potentiel</div>
                  <div className="text-lg font-semibold text-amber-400">
                    {money(f.valueCents)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* PROCHAINE ACTION */}
      {nextAction && (
        <section className="rounded-2xl border border-red-600/40 bg-slate-950 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">
            🔍 Action recommandée par l’analyse
          </h2>
          <p className="text-slate-300 font-medium">{nextAction.title}</p>
          <p className="text-sm text-slate-400">{nextAction.action}</p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              Potentiel estimé :{" "}
              <span className="font-semibold text-white">
                {money(nextAction.valueCents)}
              </span>
            </div>

            <Link
              href={`/audit?focus=${encodeURIComponent(
                nextAction.id
              )}&from=report`}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Traiter maintenant →
            </Link>
          </div>
        </section>
      )}

      {/* DÉTAILS */}
      <section className="rounded-xl border border-white/10 bg-slate-950">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-sm font-semibold text-white">Détails complets</div>
          <div className="text-xs text-slate-400">
            Sévérité décroissante · valeur estimée
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {findings.map((f) => (
            <div key={f.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        f.handled
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700/40 text-slate-300"
                      }`}
                    >
                      {f.handled ? "Traité" : "À traiter"}
                    </span>
                    <span className="text-slate-400">Sévérité {f.severity}</span>
                  </div>

                  <div className="mt-1 font-semibold text-white">{f.title}</div>

                  {f.description && (
                    <div className="text-sm text-slate-400 mt-1">
                      {f.description}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Valeur</div>
                  <div className="text-sm font-semibold text-white">
                    {money(f.valueCents)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
